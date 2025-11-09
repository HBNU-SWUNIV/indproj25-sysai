import React, { useState, useEffect, useMemo } from "react";
import "./plugin.css";
import axios from "axios";
import {
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Box,
  Pagination,
  Checkbox,
} from "@mui/material";

export default function Plugin() {
  const [showPluginInstanceModal, setshowPluginInstanceModal] = useState(false);
  const [showPluginTypeModal, setshowPluginTypeModal] = useState(false);
  const [pluginList, setPluginList] = useState(false);

  const [pluginInstanceName, setPluginInstanceName] = useState("");
  const [pluginTypeName, setPluginTypeName] = useState("");

  const [plugins, setPlugins] = useState([]);         // 인스턴스 목록
  const [pluginTypes, setPluginTypes] = useState([]); // 타입 목록

  const [modelType, setModelType] = useState("");
  const [modelTypeOptions, setModelTypeOptions] = useState([]);
  const [modelFields, setModelFields] = useState([]);

  const [pluginRendererCode, setPluginRendererCode] = useState("");
  const [optionRows, setOptionRows] = useState([]);
  const [pluginOptionSchemaValues, setPluginOptionSchemaValues] = useState({});

  const [isCameraPlugin, setIsCameraPlugin] = useState(false);
  const [serverIp, setServerIp] = useState("");

  // ✅ 선택된 항목(체크박스)
  const [selectedTypeIds, setSelectedTypeIds] = useState([]);        // type._id 배열
  const [selectedInstanceIds, setSelectedInstanceIds] = useState([]); // instance._id 배열

  // 검색
  const [searchKeyword, setSearchKeyword] = useState("");

  // API BASE
  const API_BASE = "";

  // 인스턴스 모달 열기/닫기
  const openPluginInstanceModal = () => {
    setPluginInstanceName("");
    setPluginTypeName("");
    setModelType("");
    setModelFields([]);
    setPluginOptionSchemaValues({});
    setIsCameraPlugin(false);
    setServerIp("");
    setshowPluginInstanceModal(true);
  };
  const closePluginInstanceModal = () => {
    setshowPluginInstanceModal(false);
    setPluginInstanceName("");
    setPluginTypeName("");
  };

  // 타입 모달 열기/닫기
  const openPluginTypeModal = () => {
    setPluginTypeName("");
    setPluginRendererCode("");
    setOptionRows([{ id: Date.now(), key: "", type: "" }]); // 기본 1행
    setshowPluginTypeModal(true);
  };
  const closePluginTypeModal = () => {
    setshowPluginTypeModal(false);
    setPluginTypeName("");
  };

  // 인스턴스 등록
  const handlePluginInstanceSubmit = async () => {
    if (!pluginInstanceName.trim()) return alert("플러그인 이름을 입력하세요");
    if (!pluginTypeName) return alert("플러그인 종류를 선택하세요");

    const payload = {
      instanceId: pluginInstanceName.trim(),
      typeId: pluginTypeName,
      modelType: isCameraPlugin ? " " : modelType,
      queryTemplate: {},
      options: isCameraPlugin
        ? { ...pluginOptionSchemaValues, serverIp }
        : pluginOptionSchemaValues,
    };

    try {
      await axios.post(`${API_BASE}/plugin-instance`, payload);
      alert("플러그인 인스턴스 등록 성공");
      closePluginInstanceModal();
      if (pluginList) {
        const res = await axios.get(`${API_BASE}/plugin-instance/all`);
        setPlugins(res.data || []);
      }
    } catch (err) {
      console.error("플러그인 인스턴스 등록 실패:", err.response?.data || err.message);
      alert("플러그인 인스턴스 등록 실패: " + (err.response?.data?.message || err.message));
    }
  };

  // 플러그인 타입 등록
  const handlePluginTypeSubmit = async () => {
    if (!pluginTypeName.trim()) return alert("플러그인 타입 이름을 입력하세요");
    if (pluginTypes.some((t) => t.typeId === pluginTypeName.trim())) {
      alert("이미 등록된 플러그인 타입입니다.");
      return;
    }

    const optionSchemaObj = optionRows.reduce((acc, r) => {
      const k = (r.key || "").trim();
      const v = (r.type || "").trim();
      if (k) acc[k] = v || "string";
      return acc;
    }, {});

    const payload = {
      typeId: pluginTypeName.trim(),
      rendererCode: pluginRendererCode
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\"),
      optionSchema: optionSchemaObj,
    };

    try {
      const res = await axios.post(`${API_BASE}/plugin-type`, payload);
      alert("플러그인 타입 등록 성공");
      setPluginTypes((prev) => [...prev, res.data]);
      closePluginTypeModal();
    } catch (err) {
      console.error("플러그인 타입 등록 실패:", err);
      alert("플러그인 타입 등록 실패");
    }
  };

  // 타입/인스턴스 목록
  const fetchPluginTypes = async () => {
    try {
      const res = await axios.get(`${API_BASE}/plugin-type/all`);
      setPluginTypes(res.data || []);
    } catch (err) {
      console.error("플러그인 타입 불러오기 실패:", err);
    }
  };
  useEffect(() => { fetchPluginTypes(); }, []);

  const fetchPlugins = async () => {
    try {
      const res = await axios.get(`${API_BASE}/plugin-instance/all`);
      setPlugins(res.data || []);
    } catch (err) {
      console.error("플러그인 인스턴스 목록 불러오기 실패:", err);
    }
  };
  useEffect(() => { if (pluginList) fetchPlugins(); }, [pluginList]);

  // modelType 후보 (파일명)
  useEffect(() => {
    const fetchModelTypes = async () => {
      try {
        const res = await axios.get(
          ""
        );
        if (Array.isArray(res.data)) setModelTypeOptions(res.data);
      } catch (err) {
        console.error("파일명 (modelType) 목록 불러오기 실패:", err);
      }
    };
    fetchModelTypes();
  }, []);

  // 페이징
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // 검색
  const normalizedKW = (searchKeyword || "").toLowerCase();

  const filteredTypes = useMemo(() => {
    if (!normalizedKW) return pluginTypes;
    return pluginTypes.filter((type) => {
      const typeMatch = type._id?.toLowerCase().includes(normalizedKW);
      const hasInstanceMatch = (plugins || []).some(
        (p) =>
          p.typeId === type._id &&
          (p._id?.toLowerCase().includes(normalizedKW) ||
            p.typeId?.toLowerCase().includes(normalizedKW))
      );
      return typeMatch || hasInstanceMatch;
    });
  }, [pluginTypes, plugins, normalizedKW]);

  const pageCount = Math.max(1, Math.ceil(filteredTypes.length / itemsPerPage));
  const paginatedTypes = filteredTypes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchKeyword, filteredTypes.length]);
  useEffect(() => {
    if (pluginList) {
      setSearchKeyword("");
      setSelectedTypeIds([]);
      setSelectedInstanceIds([]);
    }
  }, [pluginList]);

  // ✅ 체크박스 토글러
  const toggleTypeChecked = (typeId) => {
    setSelectedTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };
  const toggleInstanceChecked = (instanceId) => {
    setSelectedInstanceIds((prev) =>
      prev.includes(instanceId)
        ? prev.filter((id) => id !== instanceId)
        : [...prev, instanceId]
    );
  };

  // ✅ 인스턴스 단건 삭제(내부 사용)
  const _deleteInstance = async (instanceId) => {
    await axios.delete(`${API_BASE}/plugin-instance/${instanceId}`);
    setPlugins((prev) => prev.filter((p) => p._id !== instanceId));
  };

  // ✅ 타입 단건 삭제(409 시 force=true 재시도)
  const _deleteType = async (typeId) => {
    try {
      await axios.delete(`${API_BASE}/plugin-type/${encodeURIComponent(typeId)}`);
    } catch (err) {
      if (err.response?.status === 409) {
        const force = window.confirm(
          `[${typeId}] 타입을 참조하는 인스턴스가 있습니다.\n인스턴스까지 모두 삭제하고 강제 삭제할까요?`
        );
        if (!force) throw err;
        await axios.delete(
          `${API_BASE}/plugin-type/${encodeURIComponent(typeId)}?force=true`
        );
      } else {
        throw err;
      }
    }
  };

  // ✅ 일괄 삭제: 인스턴스 + 타입(버튼 하나)
  const handleBulkDeleteAll = async () => {
    const instCnt = selectedInstanceIds.length;
    const typeCnt = selectedTypeIds.length;
    if (instCnt + typeCnt === 0) return;

    if (!window.confirm(
      `선택 삭제를 진행할까요?\n- 인스턴스: ${instCnt}개\n- 타입: ${typeCnt}개`
    )) return;

    try {
      // 1) 인스턴스 먼저 삭제 (병렬)
      if (instCnt > 0) {
        await Promise.all(selectedInstanceIds.map(_deleteInstance));
        setSelectedInstanceIds([]);
      }

      // 2) 타입 삭제 (순차)
      if (typeCnt > 0) {
        for (const typeId of selectedTypeIds) {
          await _deleteType(typeId);
        }
        setSelectedTypeIds([]);
      }

      // 목록 갱신
      await fetchPluginTypes();
      await fetchPlugins();
      alert("선택 항목 삭제 완료");
    } catch (err) {
      console.error("선택 삭제 실패:", err.response?.data || err.message);
      alert("선택 삭제 중 일부 실패: " + (err.response?.data?.message || err.message));
    }
  };


  // ✅ 일괄 삭제: 인스턴스
  const handleBulkDeleteInstances = async () => {
    if (selectedInstanceIds.length === 0) return;
    if (!window.confirm(`${selectedInstanceIds.length}개 인스턴스를 삭제할까요?`)) return;

    try {
      await Promise.all(selectedInstanceIds.map(_deleteInstance));
      setSelectedInstanceIds([]);
      alert("인스턴스 삭제 완료");
    } catch (err) {
      console.error("인스턴스 삭제 실패:", err.response?.data || err.message);
      alert("일부 삭제 실패: " + (err.response?.data?.message || err.message));
    }
  };

  // ✅ 일괄 삭제: 타입
  const handleBulkDeleteTypes = async () => {
    if (selectedTypeIds.length === 0) return;
    if (!window.confirm(`${selectedTypeIds.length}개 타입을 삭제할까요?`)) return;

    try {
      for (const typeId of selectedTypeIds) {
        await _deleteType(typeId);
      }
      await fetchPluginTypes();
      await fetchPlugins();
      setSelectedTypeIds([]);
      alert("타입 삭제 완료");
    } catch (err) {
      console.error("타입 삭제 실패:", err.response?.data || err.message);
      alert("일부 삭제 실패: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="plugin">
      <h2>PLUGIN</h2>

      <div className="plugin-buttons">
        <button className="create-plugin-btn" onClick={openPluginInstanceModal}>
          + 플러그인 인스턴스 추가
        </button>
        <button className="create-plugin-btn" onClick={openPluginTypeModal}>
          + 플러그인 타입 추가
        </button>
        <button
          className="plugin-list-btn"
          onClick={() => setPluginList(!pluginList)}
        >
          플러그인 목록
        </button>
      </div>

      {/* ===== 인스턴스 등록 모달 ===== */}
      {showPluginInstanceModal && (
        <div className="plugin-modal-overlay">
          <div className="plugin-modal">
            {/* 헤더 */}
            <div className="modal-header">
              <h3>신규 플러그인 인스턴스</h3>
              <button className="close-x" onClick={closePluginInstanceModal}>×</button>
            </div>

            {/* 바디 */}
            <div className="modal-body">
              {/* 섹션 1: 기본 정보 */}
              <div className="form-section">
                <div className="form-title">기본 정보</div>
                <div className="input-row">
                  <label>인스턴스 이름</label>
                  <input
                    type="text"
                    placeholder="인스턴스 이름을 입력하세요"
                    className="plugin-input"
                    value={pluginInstanceName}
                    onChange={(e) => setPluginInstanceName(e.target.value)}
                  />
                </div>
              </div>

              {/* 섹션 2: 타입 / 모델 선택 */}
              <div className="form-section">
                <div className="form-title">타입 / 모델 선택</div>

                <div className="input-row">
                  <label>플러그인 타입 선택</label>
                  <select
                    className="plugin-select"
                    value={pluginTypeName}
                    onChange={async (e) => {
                      const selectedId = e.target.value;
                      setPluginTypeName(selectedId);

                      const selectedType = pluginTypes.find((pt) => pt._id === selectedId);
                      if (selectedType?._id?.toLowerCase().includes("camera")) {
                        setIsCameraPlugin(true);
                        setModelType("");
                      } else {
                        setIsCameraPlugin(false);
                      }

                      if (selectedType?.optionSchema && typeof selectedType.optionSchema === "object") {
                        const initialValues = {};
                        Object.keys(selectedType.optionSchema).forEach((key) => (initialValues[key] = ""));
                        setPluginOptionSchemaValues(initialValues);
                      } else {
                        setPluginOptionSchemaValues({});
                      }
                    }}
                  >
                    <option value="">-- 선택하세요 --</option>
                    {pluginTypes.map((type) => (
                      <option value={type._id} key={type._id}>{type._id}</option>
                    ))}
                  </select>
                </div>

                {!isCameraPlugin && (
                  <div className="input-row">
                    <label>모델 타입 선택</label>
                    <select
                      className="plugin-select"
                      value={modelType}
                      onChange={async (e) => {
                        const selectedModel = e.target.value;
                        setModelType(selectedModel);
                        if (selectedModel) {
                          try {
                            const res = await axios.get(`${API_BASE}/modelType/${selectedModel}/fields`);
                            setModelFields(res.data || []);
                          } catch {
                            setModelFields([]);
                          }
                        } else {
                          setModelFields([]);
                        }
                      }}
                    >
                      <option value="">-- 선택하세요 --</option>
                      {modelTypeOptions.map((type) => <option value={type} key={type}>{type}</option>)}
                    </select>
                  </div>
                )}

                {isCameraPlugin && (
                  <div className="input-row">
                    <label>카메라 서버 IP</label>
                    <input
                      type="text"
                      className="plugin-input"
                      placeholder="예) ws://localhost:8000"
                      value={serverIp}
                      onChange={(e) => setServerIp(e.target.value)}
                    />
                    <div className="form-help">카메라 타입은 모델 선택 대신 서버 IP를 사용합니다.</div>
                  </div>
                )}

                {modelFields.length > 0 && (
                  <div className="model-field-box">
                    <b>모델 타입 열 목록</b>
                    <ul>{modelFields.map((f, i) => <li key={i}>{f.field}</li>)}</ul>
                  </div>
                )}
              </div>

              {/* 섹션 3: 옵션 스키마 값 */}
              {Object.keys(pluginOptionSchemaValues).length > 0 && (
                <div className="form-section">
                  <div className="form-title">옵션 스키마 값</div>
                  {Object.entries(pluginOptionSchemaValues).map(([key, value]) => (
                    <div key={key} className="two-grid">
                      <input className="plugin-input" type="text" value={key} disabled />
                      <input
                        className="plugin-input"
                        type="text"
                        placeholder={`${key} 값 입력`}
                        value={value}
                        onChange={(e) =>
                          setPluginOptionSchemaValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 액션 */}
            <div className="plugin-modal-actions">
              <button className="cancel-button" onClick={closePluginInstanceModal}>취소</button>
              <button className="submit-button" onClick={handlePluginInstanceSubmit}>등록</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 플러그인 타입 등록 모달 ===== */}
      {showPluginTypeModal && (
        <div className="plugin-modal-overlay">
          <div className="plugin-modal">
            {/* 헤더 */}
            <div className="modal-header">
              <h3>신규 플러그인 타입</h3>
              <button className="close-x" onClick={closePluginTypeModal}>×</button>
            </div>

            {/* 바디 */}
            <div className="modal-body">
              {/* 섹션 1: 기본 정보 */}
              <div className="form-section">
                <div className="form-title">기본 정보</div>
                <div className="input-row">
                  <label>플러그인 타입 이름</label>
                  <input
                    type="text"
                    placeholder="플러그인 타입 이름을 입력하세요"
                    className="plugin-input"
                    value={pluginTypeName}
                    onChange={(e) => setPluginTypeName(e.target.value)}
                  />
                </div>
              </div>

              {/* 섹션 2: 렌더러 코드 */}
              <div className="form-section">
                <div className="form-title">렌더러 코드</div>
                <textarea
                  placeholder="렌더러 코드를 입력하세요"
                  className="plugin-input"
                  style={{ minHeight: 140, fontFamily: "ui-monospace, monospace", resize: "vertical" }}
                  value={pluginRendererCode}
                  onChange={(e) => setPluginRendererCode(e.target.value)}
                />
                <div className="form-help">문자열 치환 없이 그대로 붙여넣어도 됩니다.</div>
              </div>

              {/* 섹션 3: 옵션 스키마 */}
              <div className="form-section">
                <div className="form-title">옵션 스키마</div>
                {optionRows.map((row) => (
                  <div key={row.id} className="two-grid">
                    <input
                      type="text" placeholder="ex) xKey" className="plugin-input" value={row.key}
                      onChange={(e) =>
                        setOptionRows((prev) => prev.map((r) => r.id === row.id ? { ...r, key: e.target.value } : r))
                      }
                    />
                    <div className="schema-right">
                      <input
                        type="text" placeholder="ex) string" className="plugin-input" value={row.type}
                        onChange={(e) =>
                          setOptionRows((prev) => prev.map((r) => r.id === row.id ? { ...r, type: e.target.value } : r))
                        }
                      />
                      <button
                        onClick={() => setOptionRows((prev) => prev.filter((r) => r.id !== row.id))}
                        className="cancel-button schema-del-btn"
                      >삭제</button>
                    </div>
                  </div>
                ))}
                <button
                  className="option-add-btn"
                  onClick={() => setOptionRows((prev) => [...prev, { id: Date.now() + Math.random(), key: "", type: "" }])}
                >
                  옵션 추가
                </button>
              </div>
            </div>

            {/* 액션 */}
            <div className="plugin-modal-actions">
              <button className="cancel-button" onClick={closePluginTypeModal}>취소</button>
              <button className="submit-button" onClick={handlePluginTypeSubmit}>등록</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 플러그인 목록 ===== */}
      {pluginList && (
        <div className="plugin-list-container">
          <h3 className="plugin-list-title">플러그인 목록</h3>
            {/* ✅ 카드 안쪽으로 옮긴 일괄 삭제 툴바 */}
                <div className="bulk-toolbar">
                  <div className="bulk-toolbar-counter">
                    <b>선택된 타입</b> {selectedTypeIds.length}개
                    <span className="divider">/</span>
                    <b>선택된 인스턴스</b> {selectedInstanceIds.length}개
                  </div>
                  <div className="bulk-toolbar-actions">
                    <button
                      className="danger-btn"
                      disabled={(selectedTypeIds.length + selectedInstanceIds.length) === 0}
                      onClick={handleBulkDeleteAll}
                      title="체크된 인스턴스/타입 모두 삭제"
                    >
                      선택 삭제
                    </button>
                  </div>
                </div>
          <TextField
            fullWidth
            label="플러그인 검색"
            variant="filled"
            size="small"
            placeholder="플러그인 타입/인스턴스를 검색하세요"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiFilledInput-root": {
                backgroundColor: "var(--surface-2)",
                color: "var(--text)",
                borderRadius: "10px",
              },
              "& .MuiInputLabel-root": { color: "var(--text-muted)" },
              "& .MuiInputLabel-root.Mui-focused": { color: "var(--text)" },
              "& .MuiFilledInput-underline:before": { borderBottom: "none" },
              "& .MuiFilledInput-underline:after": { borderBottom: "none" },
              "& .MuiSvgIcon-root": { color: "var(--text)" },
            }}
          />

          <Grid container spacing={2}>
            {paginatedTypes.map((type) => {
              const instancesOfType = (plugins || []).filter((p) => p.typeId === type._id);
              const filteredInstances = normalizedKW
                ? instancesOfType.filter(
                    (p) =>
                      p._id?.toLowerCase().includes(normalizedKW) ||
                      p.typeId?.toLowerCase().includes(normalizedKW)
                  )
                : instancesOfType;

              return (
                <Grid item xs={12} sm={6} md={3} key={type._id}>
                  <Card
                    sx={{
                      height: 240,
                      backgroundColor: "#f5f5f5",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: "14px",
                      boxShadow: "none",
                    }}
                    variant="outlined"
                  >
                    <CardContent sx={{ p: 3 }}>
                      {/* 카드 헤더: 타입명 + 체크박스 */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="h6" fontWeight="800" sx={{ color: "#4bb1a7" }} gutterBottom>
                          {type._id}
                        </Typography>

                        {/* ✅ 타입 체크박스 */}
                        <Checkbox
                          size="small"
                          checked={selectedTypeIds.includes(type._id)}
                          onChange={() => toggleTypeChecked(type._id)}
                          inputProps={{ "aria-label": `select type ${type._id}` }}
                        />
                      </Box>

                      {/* 인스턴스 리스트 */}
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1.25,
                          height: 140,
                          overflowY: "auto",
                          pr: 1,
                        }}
                      >
                        {filteredInstances.map((p) => (
                          <Box
                            key={p._id}
                            sx={{
                              px: 1,
                              py: 1,
                              fontSize: 14,
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              borderRadius: 1,
                              backgroundColor: "transparent",
                              border: "1px dashed var(--border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 1,
                            }}
                          >
                            <span>{p._id}</span>

                            {/* ✅ 인스턴스 체크박스 */}
                            <Checkbox
                              size="small"
                              checked={selectedInstanceIds.includes(p._id)}
                              onChange={() => toggleInstanceChecked(p._id)}
                              inputProps={{ "aria-label": `select instance ${p._id}` }}
                            />
                          </Box>
                        ))}
                        {filteredInstances.length === 0 && (
                          <Box sx={{ color: "var(--text-muted)", fontSize: 14 }}>
                            인스턴스가 없습니다.
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Box display="flex" justifyContent="center" mt={2}>
            <Pagination
              count={pageCount}
              page={currentPage}
              onChange={(_e, value) => setCurrentPage(value)}
              sx={{
                "& .MuiPaginationItem-root": { color: "var(--text)" },
                "& .Mui-selected": {
                  backgroundColor: "var(--primary) !important",
                  color: "#fff",
                },
              }}
            />
          </Box>
        </div>
      )}
    </div>
  );
}
