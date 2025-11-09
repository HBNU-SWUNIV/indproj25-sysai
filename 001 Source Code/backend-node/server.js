const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb');
const Mustache = require('mustache');
const cors = require('cors');
require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');

const axios = require('axios');

const { swaggerUi, swaggerSpec } = require('./swagger');




// 기본 세팅
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const redis = require('redis');
const redisClient = redis.createClient({ url: "" }); // 기본 포트: 6379
// Swagger UI 경로 설정
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors());
app.use(express.json());

redisClient.connect()
  .then(() => console.log('Redis connected'))
  .catch(err => console.error('Redis connection failed:', err));

// Mongo 연결
const client = new MongoClient('');
let typeCol, instCol, dataDB;
const watchingModelTypes = new Set(); // 현재 감시 중인 모델타입을 기억하는 set
client.connect().then(async () => {
  const pluginDB = client.db('plugins');
  typeCol = pluginDB.collection('pluginTypes');
  instCol = pluginDB.collection('pluginInstances');

  dataDB = client.db('data'); // 실제 데이터 저장소
  console.log('MongoDB connected');

});

/**
 * @swagger
 * /plugin-type:
 *   post:
 *     summary: 플러그인 타입 등록
 *     description: 새로운 플러그인 타입을 등록한다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               typeId:
 *                 type: string
 *               rendererCode:
 *                 type: string
 *               optionSchema:
 *                 type: object
 *     responses:
 *       200:
 *         description: 플러그인 타입 저장 완료
 */
app.post('/plugin-type', async (req, res) => {
  const { typeId, rendererCode, optionSchema } = req.body;
  await typeCol.insertOne({ _id: typeId, rendererCode, optionSchema, createdAt: Date.now() });
  res.json({ msg: '플러그인 타입 저장 완료' });
});


/**
 * @swagger
 * /plugin-instance:
 *   post:
 *     summary: 플러그인 인스턴스 등록
 *     description: 특정 타입을 기반으로 플러그인 인스턴스를 등록한다. (modelType은 선택값)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               instanceId:
 *                 type: string
 *               typeId:
 *                 type: string
 *               modelType:
 *                 type: string
 *                 nullable: true
 *                 description: 데이터 조회용 모델타입 (카메라 등 스트리밍형은 생략 가능)
 *               queryTemplate:
 *                 type: object
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: 플러그인 인스턴스 저장 완료
 */
app.post('/plugin-instance', async (req, res) => {
  const { instanceId, typeId, modelType, queryTemplate, options } = req.body;

  if (!instanceId || !typeId) {
    return res.status(400).json({ error: "instanceId와 typeId는 필수입니다." });
  }

  // 중복 방지(선택)
  const exists = await instCol.findOne({ _id: instanceId });
  if (exists) {
    return res.status(409).json({ error: `이미 존재하는 인스턴스 ID입니다: ${instanceId}` });
  }

  const doc = {
    _id: instanceId,
    typeId,
    // modelType은 있을 때만 저장 (카메라형은 생략)
    ...(modelType ? { modelType } : {}),
    queryTemplate: queryTemplate || {},
    options: options || {},
    createdAt: Date.now()
  };

  await instCol.insertOne(doc);
  res.json({ msg: '플러그인 인스턴스 저장 완료' });
});

/**
 * @swagger
 * /plugin-instance/{id}/data:
 *   post:
 *     summary: 플러그인 인스턴스 데이터 요청
 *     description: 쿼리 템플릿과 런타임 파라미터를 이용해 데이터를 반환한다.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 플러그인 인스턴스 ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: 데이터 목록 반환
 */
app.post('/plugin-instance/:id/data', async (req, res) => {
  const { id } = req.params;
  const runtimeParams = (req.body && typeof req.body === 'object') ? req.body : {};

  try {
    const inst = await instCol.findOne({ _id: id });
    if (!inst) return res.status(404).json({ error: '인스턴스를 찾을 수 없습니다' });

    if (!inst.modelType) {
      return res.status(400).json({
        error: '이 인스턴스는 데이터 쿼리 대상이 아닙니다 (modelType 미설정).',
        hint: '카메라/스트리밍형 인스턴스는 /plugin-instance/:id/data를 호출하지 마세요.'
      });
    }

    // 1) 머스태치 컨텍스트 = options + runtimeParams
    const tmplStr = JSON.stringify(inst.queryTemplate || {});
    // userId가 숫자로 저장되어도 string으로 쓰이게 보정
    const normalizedOptions = { ...(inst.options || {}) };
    if (normalizedOptions.userId != null) normalizedOptions.userId = String(normalizedOptions.userId);

    const context = { ...normalizedOptions, ...runtimeParams };
    const rendered = Mustache.render(tmplStr, context);

    let compiled;
    try {
      compiled = JSON.parse(rendered);
    } catch (e) {
      console.error('쿼리 템플릿 JSON 파싱 실패:', rendered);
      return res.status(400).json({ error: 'queryTemplate 렌더 결과가 올바른 JSON이 아닙니다.' });
    }

    // 2) 안전 기본값 (ts 기준으로 최신부터)
    const filter     = (compiled && typeof compiled.filter === 'object') ? compiled.filter : {};
    const projection = (compiled && typeof compiled.projection === 'object') ? { projection: compiled.projection } : undefined;
    const sort       = (compiled && typeof compiled.sort === 'object') ? compiled.sort : { ts: -1 };
    const limit      = (compiled && Number.isInteger(compiled.limit)) ? compiled.limit : 50;

    // 3) 캐시 키에 options/inst.modelType까지 포함 (옵션 변경 → 캐시 미스)
    const cacheKey = `plugin:${id}:query:${JSON.stringify({ modelType: inst.modelType, ...context, filter, sort, limit, projection })}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      // 디버그 로그: 실제 필터 확인에 유용
      console.log('[CACHE HIT]', id, 'filter=', JSON.stringify(filter));
      return res.json(JSON.parse(cached));
    }

    // 4) 디버그 로그: 실제 질의 내용 확인
    console.log('[QUERY]', id, 'ctx=', context, 'filter=', JSON.stringify(filter), 'sort=', sort, 'limit=', limit);

    const col = dataDB.collection(inst.modelType);
    let cursor = col.find(filter, projection);
    if (sort)  cursor = cursor.sort(sort);
    if (limit) cursor = cursor.limit(limit);

    const data = await cursor.toArray();

    await redisClient.setEx(cacheKey, 60, JSON.stringify(data));
    return res.json(data);

  } catch (err) {
    console.error('데이터 처리 실패:', err);
    return res.status(500).json({ error: '서버 오류' });
  }
});

app.patch('/plugin-instance/:id', async (req, res) => {
// GET과 같은 전처리
let { id } = req.params;
try {
  id = decodeURIComponent(id);
} catch (_) {}
id = String(id).normalize('NFC').trim();

const { typeId, modelType, queryTemplate, options } = req.body || {};
const update = {};
if (typeId !== undefined)        update.typeId = typeId;
if (modelType !== undefined)     update.modelType = modelType;
if (queryTemplate !== undefined) update.queryTemplate = queryTemplate;
if (options !== undefined)       update.options = options;

try {
  const result = await instCol.findOneAndUpdate(
      { _id: id },                  // ← GET과 똑같이 매칭
      { $set: update },
      { returnDocument: 'after' }
  );
  if (!result.value) {
    return res.status(404).json({ error: '인스턴스를 찾을 수 없습니다' });
  }
  return res.json({ msg: '업데이트 완료', instance: result.value });
} catch (e) {
  console.error('인스턴스 업데이트 실패:', e);
  return res.status(500).json({ error: '서버 오류' });
}
});


/**
 * @swagger
 * /cache/event:
 *   post:
 *     summary: 특정 modelType에 대한 Redis 캐시 삭제
 *     description: 주어진 modelType에 해당하는 Redis 캐시 키들을 찾아 모두 삭제합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelType:
 *                 type: string
 *                 example: Movie
 *                 description: 캐시를 삭제할 대상 모델 타입
 *     responses:
 *       200:
 *         description: 캐시 삭제 완료
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: 캐시 삭제 완료
 *                 deletedKeys:
 *                   type: integer
 *                   example: 3
 *       500:
 *         description: Redis 캐시 삭제 실패
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 캐시 삭제 실패
 */
app.post('/cache/event', async (req, res) => {
  const {modelType} = req.body;
  try {
    const keys = await redisClient.keys(`plugin:*:query:*${modelType}*`);
    for (const key of keys) {
      await redisClient.del(key);
      console.log(`캐시 삭제: ${key}`);
    }
    res.json({msg: '캐시 삭제 완료', deletedKeys: keys.length});
  } catch (err) {
    console.error('Redis 캐시 삭제 실패: ', err);
    res.status(500).json({ error: '캐시 삭제 실패'});
  }
})


/**
 * @swagger
 * /plugin-instance/{id}:
 *   delete:
 *     summary: 플러그인 인스턴스 삭제
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 해당 인스턴스 없음
 */
app.delete('/plugin-instance/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await instCol.deleteOne({
      _id: id
    });

    if(result.deletedCount == 0) {
      return res.status(404).json({error: '해당 플러그인 인스턴스를 찾을 수 없음.'})
    }

    res.json({message: '플러그인 인스턴스가 성공적으로 삭제됨'});
  } catch (err) {
    console.error('삭제 오류: ', err);
    res.status(500).json({error: '서버 내부 오류'});
  }
});

/**
 * @swagger
 * /plugin-type/{id}/renderer:
 *   get:
 *     summary: 플러그인 렌더러 코드 조회
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 렌더러 코드 반환
 */
app.get('/plugin-type/:id/renderer', async (req, res) => {
  const t = await typeCol.findOne({ _id: req.params.id }, { projection: { rendererCode: 1 } });
  if (!t) return res.status(404).json({ error: '렌더러 코드를 찾을 수 없습니다' });
  res.json({ rendererCode: t.rendererCode });
});

/**
 * @swagger
 * /plugin-type/all:
 *   get:
 *     summary: 플러그인 타입 전체 조회
 *     responses:
 *       200:
 *         description: 플러그인 타입 목록 반환
 */
app.get('/plugin-type/all', async (req, res) => {
  try{
    const types = await typeCol.find().toArray();
    res.json(types);
  } catch (error) {
    console.error('플러그인 타입을 불러올 수 없습니다: ', error);
    res.status(500).json({msg: "플러그인 타입 불러오기 실패"});
  }
})

/**
 * @swagger
 * /plugin-instance/all:
 *   get:
 *     summary: 플러그인 인스턴스 전체 조회
 *     responses:
 *       200:
 *         description: 플러그인 인스턴스 목록 반환
 */
app.get('/plugin-instance/all', async (req, res) => {
  try {
    const instances = await instCol.find().toArray();
    res.json(instances);
  } catch (error) {
    console.error('플러그인 인스턴스를 불러올 수 없습니다: ', error);
    res.status(500).json({ msg: "플러그인 인스턴스 불러오기 실패" });
  }
});

/**
 * @swagger
 * /modelType/{name}/fields:
 *   get:
 *     summary: 특정 모델타입의 필드 정보 조회
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 필드 정보 반환
 */
app.get('/modelType/:name/fields', async (req, res) => {
  const { name } = req.params;
  try {
    const sample = await dataDB.collection(name).findOne();
    if (!sample || !sample.fields) {
      return res.status(404).json({ error: '필드 정보 없음' });
    }

    const fields = Object.entries(sample.fields).map(([key, value]) => ({
      field: key,
      type: typeof value,
      example: value
    }));

    res.json(fields);
  } catch (err) {
    console.error('필드 구조 조회 실패:', err);
    res.status(500).json({ error: '필드 구조 조회 실패' });
  }
});

/**
 * @swagger
 * /plugin-instance/{id}:
 *   get:
 *     summary: 특정 플러그인 인스턴스 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 플러그인 인스턴스 정보 반환
 */
app.get('/plugin-instance/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const instance = await instCol.findOne({ _id: id });
    if (!instance) {
      return res.status(404).json({ error: '인스턴스를 찾을 수 없습니다' });
    }
    res.json(instance);
  } catch (error) {
    console.error('인스턴스 조회 실패:', error);
    res.status(500).json({ error: '서버 오류' });
  }
});



/**
 * @swagger
 * /plugin-type/{id}:
 *   delete:
 *     summary: 플러그인 타입 삭제
 *     description: 기본적으로 해당 타입을 참조하는 인스턴스가 있으면 409를 반환합니다. `?force=true`로 강제 삭제 가능 (관련 인스턴스도 함께 삭제).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 플러그인 타입 ID
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *         description: true일 경우 관련 인스턴스까지 모두 삭제
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       404:
 *         description: 해당 타입 없음
 *       409:
 *         description: 관련 인스턴스가 존재하여 삭제 불가(강제 삭제 미요청)
 *       500:
 *         description: 서버 내부 오류
 */
app.delete('/plugin-type/:id', async (req, res) => {
  const { id } = req.params;
  const force = String(req.query.force).toLowerCase() === 'true';

  try {
    const type = await typeCol.findOne({ _id: id });
    if (!type) return res.status(404).json({ error: '해당 플러그인 타입을 찾을 수 없습니다' });

    const dependents = await instCol.countDocuments({ typeId: id });

    if (dependents > 0 && !force) {
      return res.status(409).json({
        error: '해당 타입을 사용하는 인스턴스가 존재합니다',
        instances: dependents,
        hint: 'query에 ?force=true 를 붙여 강제 삭제하거나, 먼저 관련 인스턴스를 삭제하세요'
      });
    }

    let deletedInstances = 0;
    if (dependents > 0 && force) {
      const delRes = await instCol.deleteMany({ typeId: id });
      deletedInstances = delRes.deletedCount || 0;
      console.log(`강제 삭제로 인한 인스턴스 제거: ${deletedInstances}건`);
    }

    const delTypeRes = await typeCol.deleteOne({ _id: id });
    if (delTypeRes.deletedCount === 0) {
      return res.status(404).json({ error: '삭제할 플러그인 타입을 찾을 수 없습니다' });
    }

    return res.json({
      message: '플러그인 타입 삭제 완료',
      deletedInstances
    });
  } catch (err) {
    console.error('플러그인 타입 삭제 오류:', err);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
});


server.listen(3000, () => console.log('Param‑Instance server @3000'));
