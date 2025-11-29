// frontend\src\pages\Dashboard\Dashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "./dashboard.css";
import DynamicPieChart from "components/chart/PieChart";
import DynamicAreaChart from "components/chart/SimpleAreaChart";
import DynamicBarChart from "components/chart/SimpleBarChart";
import DynamicLineChart from "components/chart/SimpleLineChart";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import axios from "axios";
import DeleteIcon from "@mui/icons-material/DeleteForever";
import PluginRenderer from "components/plugin/PluginRenderer";
import { FixedSizeList } from "react-window";
import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";

const ResponsiveGridLayout = WidthProvider(Responsive);

const userId = 54;

// memoized WidgetContent with logging
const WidgetContent = React.memo(
  function WidgetContent({
    widgetInfo,
    widgetId,
    item,
    renderChart,
    reloadKey,
  }) {
    if (!widgetInfo) {
      return <div className="widget-label">+ 더블클릭하여 컴포넌트 추가</div>;
    }
    return (
      <div className="widget-content">
        {renderChart(widgetInfo, widgetId, item, reloadKey)}
      </div>
    );
  },
  (prev, next) =>
    prev.widgetInfo === next.widgetInfo &&
    prev.widgetId === next.widgetId &&
    prev.item === next.item &&
    prev.reloadKey === next.reloadKey
);

export default function Dashboard() {
  const [layout, setLayout] = useState([]);
  const [widgets, setWidgets] = useState({});
  const [tables, setTables] = useState([]);
  const [tableData, setTableData] = useState({});
  const [showChartType, setShowChartType] = useState(false);
  const [templates, setTemplates] = useState({});
  const [availableKeys, setAvailableKeys] = useState([]);
  const [currentTemplateName, setCurrentTemplateName] = useState(null);
  const [currentTemplateId, setCurrentTemplateId] = useState(null);
  const [counter, setCounter] = useState(1);
  const [pluginChartTypes, setPluginChartTypes] = useState([]);
  const [showDataSelection, setShowDataSelection] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedChartType, setSelectedChartType] = useState(null);
  const [highlightedWidgetId, setHighlightedWidgetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const wsRef = useRef(null);
  const pendingSubsRef = useRef([]);
  // — WebSocket reconnect helpers —
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const pendingModelUpdatesRef = useRef(new Set());
  const skipLayoutChangeRef = useRef(false);

  const fetchFileData = useCallback(async (fileName) => {
    if (!fileName) return;
    try {
      const encoded = encodeURIComponent(fileName);
      const res = await axios.get(
        ``
      );
      const raw = res.data;
      if (!Array.isArray(raw) || raw.length === 0) return;

      const sample = raw[0];
      const data = sample.fields ? raw.map((r) => r.fields) : raw;
      const headers = Object.keys(data[0]);
      const rows = data.map((item) => headers.map((h) => item[h]));

      setTableData((prev) => ({
        ...prev,
        [fileName]: [headers, ...rows],
      }));
    } catch (error) {
      console.error("파일 데이터 불러오기 실패:", error);
    }
  }, []);

  useEffect(() => {
    let destroyed = false;
    const CONNECT_URL =
      "";

    const connect = () => {
      if (destroyed) return;
      const ws = new WebSocket(CONNECT_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket connected:", CONNECT_URL);
        // 기본 구독(필요시 더 추가 가능)
        try {
          ws.send(
            JSON.stringify({ type: "subscribe", modelType: "pose_events" })
          );
        } catch (e) {
          console.error("WS subscribe error:", e);
        }
      };

      // ⬇️ 여기 onmessage는 위 '패치 1' 코드로
      ws.onmessage = (event) => {
        try {
          const text = typeof event.data === "string" ? event.data : "";
          const msg = text ? JSON.parse(text) : {};

          const isUpdate =
            (msg && msg.type === "update") || (msg && msg.event === "update");

          if (!isUpdate || !msg.modelType) {
            console.debug("WS non-update or no modelType:", event.data);
            return;
          }

          // ----------------------------------
          // 1) pose_events 업데이트 처리 (Home 방식 동일)
          // ----------------------------------
          if (msg.modelType === "pose_events") {
            console.log("[Dashboard WS] pose_events update:", msg);

            // 🔥 pose 이벤트 들어오면 100ms에 최대 1번만 reloadTrigger 증가
            if (!ws._poseTickTimer) {
              ws._poseTickTimer = setTimeout(() => {
                setReloadTrigger((n) => n + 1);
                ws._poseTickTimer = null;
              }, 100);
            }

            // 어느 위젯이 pose인지 판단할 때 사용
            pendingModelUpdatesRef.current.add("pose_events");
          }

          // ----------------------------------
          // 2) 데이터가 배열로 왔을 때만 table 캐시 변경
          // ----------------------------------
          if (Array.isArray(msg.data)) {
            setTableData((prev) => ({
              ...prev,
              [msg.modelType]: msg.data,
            }));
          }
        } catch (err) {
          console.error("⚠️ WS message parse error:", err, event.data);
        }
      };

      ws.onerror = (e) => console.error("WebSocket error:", e);
      ws.onclose = (e) => {
        wsRef.current = null;
        if (destroyed) return;
        console.warn(
          `⚠️ WebSocket closed: code=${e.code}, reason=${e.reason || "(none)"}`
        );
        setTimeout(connect, 3000); // 재연결
      };
    };

    connect();
    return () => {
      destroyed = true;
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
  }, []); // ✅ 의존성 없음: 한 번만 연결

  const subscribeModelTypes = (fileNames = []) => {
    const unique = Array.from(new Set(fileNames.filter(Boolean)));
    unique.forEach((file) => {
      const payload = JSON.stringify({ type: "subscribe", modelType: file });
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(payload);
      else pendingSubsRef.current.push(payload);
    });
  };

  const unsubscribeModelTypes = (fileNames = []) => {
    const unique = Array.from(new Set(fileNames.filter(Boolean)));
    unique.forEach((file) => {
      const payload = JSON.stringify({ type: "unsubscribe", modelType: file });
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(payload);
      else pendingSubsRef.current.push(payload);
    });
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [filesRes, templatesRes, pluginsRes] = await Promise.all([
          axios.get(
            ""
          ),
          axios.get(
            ``
          ),
          axios.get(
            ""
          ),
        ]);

        setTables(filesRes.data || []);
        await Promise.all((filesRes.data || []).map(fetchFileData));
        await Promise.all(
          (templatesRes.data || []).map((t) => fetchTemplatesFromServer(t.id))
        );
        setPluginChartTypes(pluginsRes.data || []);
      } catch (error) {
        console.error("데이터 불러오기 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchUploadedFileNames = async () => {
      try {
        const res = await axios.get(
          ""
        );
        if (Array.isArray(res.data)) setTables(res.data);
        res.data.forEach((fileName) => fetchFileData(fileName));
      } catch (err) {
        console.error("파일명 목록 불러오기 실패:", err);
      }
    };

    const fetchAllTemplates = async () => {
      try {
        const res = await axios.get(
          ``
        );
        res.data.forEach((template) => fetchTemplatesFromServer(template.id));
      } catch (err) {
        console.error("템플릿 목록 불러오기 실패:", err);
      }
    };

    const fetchPluginChartTypes = async () => {
      try {
        const res = await axios.get(
          ""
        );
        setPluginChartTypes(res.data.map((item) => item));
      } catch (err) {
        console.error("플러그인 인스턴스 목록 불러오기 실패:", err);
      }
    };

    fetchUploadedFileNames();
    fetchAllTemplates();
    fetchPluginChartTypes();
    fetchAllData();
  }, []);

  useEffect(() => {
    if (pendingModelUpdatesRef.current.size === 0) return;
    const targets = Array.from(pendingModelUpdatesRef.current);
    pendingModelUpdatesRef.current.clear();
    targets.forEach((modelType) => fetchFileData(modelType));
  }, [reloadTrigger, fetchFileData]);

  const fetchTemplatesFromServer = async (templateId) => {
    try {
      const res = await axios.get(
        ``
      );
      const components = res.data.customs;
      if (!Array.isArray(components)) return;

      const layout = components.map((comp) => ({
        i: comp.componentId.toString(),
        x: comp.x / 100,
        y: comp.y / 50,
        w: comp.width / 100,
        h: comp.height / 50,
      }));

      const widgets = {};
      components.forEach((comp) => {
        widgets[comp.componentId.toString()] = {
          chart: comp.query?.modelType || "none",
          file: comp.query?.file || null,
          key: comp.query?.key || null,
        };
      });

      const userList = components[0]?.userList;
      const templateName = userList?.name || `템플릿_${userList?.id}`;
      const templateIdFromResponse = userList?.id;

      setTemplates((prev) => ({
        ...prev,
        [templateName]: {
          id: templateIdFromResponse,
          layout,
          widgets,
        },
      }));
    } catch (err) {
      // console.error("서버에서 템플릿 불러오기 실패:", err);
    }
  };

  const handleAddComponent = () => {
    const newId = counter.toString();
    const newItem = { i: newId, x: 0, y: Infinity, w: 3, h: 3 };
    setLayout((prev) => [...prev, newItem]);
    setCounter((prev) => prev + 1);
    setSelectedWidget(newId);
  };

  const handleSelectData = (fileName) => {
    setSelectedTable(fileName);
    if (!selectedWidget || !selectedChartType) return;

    const header = tableData[fileName]?.[0] || [];
    if (
      selectedChartType === "Pie Chart" ||
      selectedChartType === "Live Chart"
    ) {
      setAvailableKeys(header.slice(1));
      return;
    }

    setWidgets((prev) => ({
      ...prev,
      [selectedWidget]: {
        chart: selectedChartType,
        file: fileName,
      },
    }));

    setSelectedWidget(null);
    setSelectedTable(null);
    setShowDataSelection(false);
    setSelectedChartType(null);
  };

  const handleSelectChartType = (chartType) => {
    if (!selectedWidget) return;
    setSelectedChartType(chartType);

    const isPluginChart = pluginChartTypes.some(
      (plugin) => plugin._id === chartType
    );
    if (isPluginChart) {
      setWidgets({ ...widgets, [selectedWidget]: { chart: chartType } });
      setSelectedWidget(null);
      setShowChartType(false);
      return;
    }

    if (chartType === "Camera") {
      setWidgets({ ...widgets, [selectedWidget]: { chart: "Camera" } });
      setSelectedWidget(null);
      setShowChartType(false);
      setShowDataSelection(false);
      return;
    }

    setShowChartType(false);
    setShowDataSelection(true);
  };

  const handleKeySelect = (key) => {
    setWidgets({
      ...widgets,
      [selectedWidget]: {
        file: selectedTable,
        chart: selectedChartType,
        key,
      },
    });
    setSelectedWidget(null);
    setSelectedTable(null);
    setShowChartType(false);
    setAvailableKeys([]);
    setSelectedChartType(null);
    setShowDataSelection(false);
  };

  // ✅ PluginChartRenderer 수정 (forwardRef 사용)
  const PluginChartRenderer = React.forwardRef(
    ({ pluginInstance, widgetSize }, ref) => {
      const [Plugincode, setPluginCode] = useState("");
      const [pluginData, setPluginData] = useState([]);
      const [pluginOptions, setPluginOptions] = useState({});
      const [forceKey, setForceKey] = useState(0);

      // 🔹 loadPlugin 함수 정의
      const loadPlugin = async () => {
        if (!pluginInstance) return;
        try {
          const instanceId = pluginInstance._id;
          const pluginTypeId = pluginInstance.typeId;

          // 1. 렌더러 코드 요청
          const res1 = await axios.get(
            ``
          );
          setPluginCode(res1.data.rendererCode);

          // 2. 데이터 요청
          const res2 = await axios.post(
            ``,
            {}
          );
          const rawData = res2.data || [];
          let processedData = [];

          if (rawData.length > 0) {
            if (rawData[0].fields !== undefined) {
              processedData = rawData.map((item) => item.fields);
            } else {
              processedData = rawData;
            }
          }
          setPluginData(processedData);

          // 3. 옵션 요청
          const res3 = await axios.get(
            ``
          );
          setPluginOptions(res3.data.options);

          console.log("📊 pose_events 데이터 새로 로드 완료");
          setForceKey(Date.now());
        } catch (e) {
          console.error("플러그인 로드 실패:", e);
        }
      };

      // 초기 로드
      useEffect(() => {
        loadPlugin();
      }, [pluginInstance]);

      // 🔹 부모(Dashboard)에서 reload() 호출 가능하도록 연결
      React.useImperativeHandle(ref, () => ({
        reload: loadPlugin,
      }));

      const chartPaddingY = 32;
      const width = widgetSize.w * 100;
      const height = widgetSize.h * 50 - chartPaddingY;

      return (
        <div className="chart-host">
          {Plugincode && (
            <PluginRenderer
              key={`${pluginInstance._id}-${forceKey}-${Plugincode.length}`}
              code={Plugincode}
              data={pluginData}
              options={pluginOptions}
              width={width}
              height={height}
            />
          )}
        </div>
      );
    }
  );

  // 카메라 영상 스트리밍
  function CameraStream({ widgetSize }) {
    const canvasRef = React.useRef(null);
    const wsRef = React.useRef(null);

    React.useEffect(() => {
      const ws = new WebSocket("");
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      let destroyed = false;

      const drawBlobToCanvas = async (blob) => {
        const canvas = canvasRef.current;
        if (!canvas || destroyed) return;
        const ctx = canvas.getContext("2d");
        try {
          const bitmap = await createImageBitmap(blob);
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          if (bitmap.close) bitmap.close();
        } catch (_) {
          const img = new Image();
          img.onload = () => {
            if (!canvasRef.current || destroyed) return;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(img.src);
          };
          img.src = URL.createObjectURL(blob);
        }
      };

      ws.onmessage = (e) => {
        const blob = new Blob([e.data], { type: "image/jpeg" });
        drawBlobToCanvas(blob);
      };

      ws.onerror = (err) => console.error("Camera WS error:", err);

      return () => {
        destroyed = true;
        try {
          ws.close();
        } catch (_) {}
      };
    }, []);

    const chartPaddingY = 16;
    const width = widgetSize.w * 100;
    const height = widgetSize.h * 50 - chartPaddingY;

    return (
      <div className="chart-host">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ width, height, display: "block" }}
        />
      </div>
    );
  }
  // 플러그인 위젯별 ref 보관
  const pluginChartRefs = useRef({});

  const renderChart = (widgetInfo, widgetId, widgetSize) => {
    if (!widgetInfo || !widgetInfo.chart) return null;

    // 플러그인 차트 (_id / modelType / typeId 모두 매칭 지원)
    const isPluginChart = pluginChartTypes.some(
      (plugin) =>
        plugin._id === widgetInfo.chart ||
        plugin.modelType === widgetInfo.chart ||
        plugin.typeId === widgetInfo.chart
    );
    if (isPluginChart) {
      const pluginInstance = pluginChartTypes.find(
        (plugin) =>
          plugin._id === widgetInfo.chart ||
          plugin.modelType === widgetInfo.chart ||
          plugin.typeId === widgetInfo.chart
      );

      // 위젯별 개별 ref 생성/보관
      if (!pluginChartRefs.current[widgetId]) {
        pluginChartRefs.current[widgetId] = React.createRef();
      }

      return (
        <PluginChartRenderer
          key={widgetId}
          ref={pluginChartRefs.current[widgetId]}
          pluginInstance={pluginInstance}
          widgetSize={widgetSize}
        />
      );
    }

    // 카메라
    if (widgetInfo.chart === "Camera") {
      return <CameraStream widgetSize={widgetSize} />;
    }

    // 일반 차트
    if (!widgetInfo.file) return <p>데이터 파일을 선택하세요.</p>;
    const rawData = tableData[widgetInfo.file];
    if (!rawData || rawData.length < 2) return <p>유효한 데이터가 없습니다.</p>;

    const header = rawData[0];
    const rows = rawData.slice(1);

    // ✅ 레전드/상하 여백 보정
    const chartPaddingY = 32;
    const width = widgetSize.w * 100;
    const height = widgetSize.h * 50 - chartPaddingY;

    const parsedData = rows.map((row) => {
      const obj = { name: row[0] };
      for (let i = 1; i < header.length; i++)
        obj[header[i]] = Number(row[i]) || 0;
      return obj;
    });

    const paginationModel = { page: 0, pageSize: 5 };

    switch (widgetInfo.chart) {
      case "Pie Chart": {
        const key = widgetInfo.key || header[1];
        const pieData = parsedData.map((row) => ({
          name: row.name,
          value: row[key] || 0,
        }));
        return (
          <div className="chart-host">
            <DynamicPieChart data={pieData} width={width} height={height} />
          </div>
        );
      }
      case "Area Chart":
        return (
          <div className="chart-host">
            <DynamicAreaChart data={parsedData} width={width} height={height} />
          </div>
        );
      case "Bar Chart":
        return (
          <div className="chart-host">
            <DynamicBarChart data={parsedData} width={width} height={height} />
          </div>
        );
      case "Line Chart":
        return (
          <div className="chart-host">
            <DynamicLineChart data={parsedData} width={width} height={height} />
          </div>
        );
      case "Table": {
        const columns = header.map((h) => ({
          field: h,
          headerName: h,
          flex: 1,
        }));
        const gridRows = rows.map((row, i) => {
          const obj = { id: i + 1 };
          header.forEach((h, j) => (obj[h] = row[j] || ""));
          return obj;
        });
        return (
          <Paper
            sx={{
              width,
              height,
              bgcolor: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
            elevation={0}
          >
            <DataGrid
              rows={gridRows}
              columns={columns}
              disableRowSelectionOnClick
              initialState={{ pagination: { paginationModel } }}
              pageSizeOptions={[5, 10, 15]}
              sx={{
                width: "100%",
                height: "100%",
                border: 0,
                color: "var(--text)",
                "& .MuiDataGrid-columnHeaders": {
                  bgcolor: "var(--surface-2)",
                  color: "var(--text)",
                  borderBottom: "1px solid var(--border)",
                },
                "& .MuiDataGrid-cell": { borderColor: "var(--border)" },
                "& .MuiTablePagination-root": { color: "var(--text)" },
                "& .MuiSvgIcon-root": { color: "var(--text)" },
              }}
            />
          </Paper>
        );
      }
      default:
        return <p>차트 유형 미지원</p>;
    }
  };

  const handleNewTemplate = async () => {
    const name = prompt("새 템플릿 이름을 입력하세요:");
    if (!name) return;

    if (templates.hasOwnProperty(name)) {
      alert("이미 존재하는 템플릿 이름입니다. 다른 이름을 입력해주세요.");
      return;
    }

    try {
      const res = await axios.post(
        "",
        { name, userId }
      );
      const templateId = res.data.id;
      setCurrentTemplateId(templateId);
      setCurrentTemplateName(name);

      const newTemplate = { id: templateId, layout: [], widgets: {} };
      setTemplates((prev) => ({ ...prev, [name]: newTemplate }));
    } catch (error) {
      console.error("템플릿 서버 생성 실패:", error);
    }

    setLayout([]);
    setWidgets({});
    setCounter(1);
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplateId) return alert("템플릿이 선택되지 않았습니다.");

    const components = layout
      .map((item) => {
        const info = widgets[item.i];
        if (!info || !info.chart) return null;

        return {
          componentId: parseInt(item.i),
          x: item.x * 100,
          y: item.y * 50,
          width: item.w * 100,
          height: item.h * 50,
          query: {
            modelType: info.chart,
            file: info.file,
            key: info.key || null,
          },
        };
      })
      .filter(Boolean);

    const payload = { userListId: currentTemplateId, components };

    try {
      await axios.post(
        "",
        payload
      );
      const usedFiles = Object.values(widgets).map((w) => w?.file);
      subscribeModelTypes(usedFiles);
      alert("저장 완료되었습니다.");
    } catch (error) {
      console.error("컴포넌트 저장 실패:", error);
      alert("컴포넌트 저장에 실패했습니다.");
    }

    setTemplates((prev) => ({
      ...prev,
      [currentTemplateName]: {
        id: currentTemplateId,
        layout,
        widgets,
      },
    }));
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplateName || !currentTemplateId) return;
    const confirmDelete = window.confirm(
      `${currentTemplateName} 템플릿을 삭제하시겠습니까?`
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(
        ``
      );
      const updated = { ...templates };
      delete updated[currentTemplateName];
      setTemplates(updated);
      setLayout([]);
      setWidgets({});
      setCurrentTemplateName(null);
      setCurrentTemplateId(null);
      alert("템플릿이 삭제되었습니다.");
    } catch (err) {
      console.error("템플릿 삭제 실패:", err);
      alert("템플릿 삭제에 실패했습니다.");
    }
  };

  const loadTemplate = (name) => {
    const template = templates[name];
    if (!template) return;
    setLayout(template.layout);
    setWidgets(template.widgets);
    setCurrentTemplateName(name);
    setCurrentTemplateId(template.id);
    const maxId = template.layout.reduce(
      (max, item) => Math.max(max, parseInt(item.i)),
      0
    );
    setCounter(maxId + 1);
  };

  const isCursorOverTrash = (clientX, clientY) => {
    const trash = document.querySelector(".deleteIcon");
    const rect = trash?.getBoundingClientRect();
    return (
      rect &&
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    );
  };

  if (loading) return <p>데이터 로딩 중...</p>;

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>분석용 위젯을 배치하고 템플릿으로 저장할 수 있습니다.</p>
      </div>

      <div className="template-controls">
        <button onClick={handleAddComponent}>+ Component</button>
        <button onClick={handleSaveTemplate}>Save</button>
        <button onClick={handleDeleteTemplate}>Delete</button>
        <button className="btn-new-template" onClick={handleNewTemplate}>
          + New Template
        </button>
      </div>

      <div className="template-list">
        {Object.entries(templates).map(([name]) => (
          <button
            key={name}
            onClick={() => loadTemplate(name)}
            className={`template-chip ${
              name === currentTemplateName ? "active-template" : ""
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <DeleteIcon
        className="deleteIcon"
        onDragOver={(e) => e.preventDefault()}
      />

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
        rowHeight={50}
        onLayoutChange={(newLayout) => {
          if (skipLayoutChangeRef.current) {
            skipLayoutChangeRef.current = false;
            return;
          }
          if (JSON.stringify(newLayout) !== JSON.stringify(layout))
            setLayout(newLayout);
        }}
        isDraggable
        isResizable
        onDrag={(layout, oldItem, _n, _p, e) => {
          const widgetId = oldItem.i;
          if (isCursorOverTrash(e.clientX, e.clientY))
            setHighlightedWidgetId(widgetId);
          else setHighlightedWidgetId(null);
        }}
        onDragStop={(layout, oldItem, _newItem, _placeholder, e) => {
          const widgetId = oldItem.i;
          setHighlightedWidgetId(null);
          if (isCursorOverTrash(e.clientX, e.clientY)) {
            if (window.confirm("컴포넌트를 삭제하시겠습니까?")) {
              const removedFile = widgets[widgetId]?.file || null;
              const stillUsedByOthers = removedFile
                ? Object.entries(widgets).some(
                    ([id, w]) => id !== widgetId && w?.file === removedFile
                  )
                : false;

              skipLayoutChangeRef.current = true;
              setLayout((prev) => prev.filter((item) => item.i !== widgetId));
              setWidgets((prev) => {
                const newWidgets = { ...prev };
                delete newWidgets[widgetId];
                return newWidgets;
              });

              if (removedFile && !stillUsedByOthers) {
                unsubscribeModelTypes([removedFile]);
              }
            }
          }
        }}
      >
        {layout.map((item) => {
          const widget = widgets[item.i];
          let isPoseWidget = false;

          if (widget && widget.chart) {
            const pluginInstance = pluginChartTypes.find(
              (plugin) =>
                plugin._id === widget.chart ||
                plugin.modelType === widget.chart ||
                plugin.typeId === widget.chart
            );

            if (pluginInstance && pluginInstance.modelType === "pose_events") {
              isPoseWidget = true;
            }

            if (widget.file === "pose_events") {
              isPoseWidget = true;
            }
          }

          const reloadKey = isPoseWidget ? reloadTrigger : 0;

          return (
            <div
              key={item.i}
              className={`widget ${
                highlightedWidgetId === item.i ? "drag-to-trash" : ""
              }`}
              onDoubleClick={() => {
                setSelectedWidget(item.i);
                const widget = widgets[item.i];
                if (widget?.chart) setSelectedChartType(widget.chart);
                setShowChartType(true);
                setShowDataSelection(false);
              }}
            >
              <WidgetContent
                widgetInfo={widget}
                widgetId={item.i}
                item={item}
                renderChart={renderChart}
                reloadKey={reloadKey}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>

      {selectedWidget && showDataSelection && (
        <div className="data-selection">
          <div className="data-selection-header">
            <h3>데이터 선택</h3>
            <button
              className="closeBtn"
              onClick={() => {
                setSelectedWidget(null);
                setShowDataSelection(false);
              }}
            >
              ×
            </button>
          </div>
          <Box
            sx={{ width: "100%", height: 300, maxWidth: 400, margin: "0 auto" }}
          >
            <FixedSizeList
              height={300}
              width={400}
              itemSize={48}
              itemCount={tables.length}
              overscanCount={3}
            >
              {({ index, style }) => {
                const table = tables[index];
                return (
                  <ListItem
                    style={style}
                    key={table}
                    component="div"
                    disablePadding
                  >
                    <ListItemButton onClick={() => handleSelectData(table)}>
                      <ListItemText primary={table} />
                    </ListItemButton>
                  </ListItem>
                );
              }}
            </FixedSizeList>
          </Box>
        </div>
      )}

      {showChartType && (
        <div className="data-selection">
          <div className="data-selection-header">
            <h3>차트 유형 선택</h3>
            <button
              className="closeBtn"
              onClick={() => {
                setSelectedWidget(null);
                setSelectedTable(null);
                setShowChartType(false);
                setShowDataSelection(false);
              }}
            >
              ×
            </button>
          </div>
          <Box
            sx={{ width: "100%", height: 300, maxWidth: 400, margin: "0 auto" }}
          >
            <FixedSizeList
              height={300}
              width={400}
              itemSize={48}
              itemCount={6 + pluginChartTypes.length}
              overscanCount={3}
            >
              {({ index, style }) => {
                const chartTypes = [
                  "Pie Chart",
                  "Area Chart",
                  "Bar Chart",
                  "Line Chart",
                  "Table",
                  "Camera",
                ];
                const fullList = [
                  ...chartTypes,
                  ...pluginChartTypes.map((p) => p._id),
                ];
                const chart = fullList[index];

                return (
                  <ListItem
                    style={style}
                    key={chart}
                    component="div"
                    disablePadding
                  >
                    <ListItemButton
                      onClick={() => handleSelectChartType(chart)}
                    >
                      <ListItemText primary={chart} />
                    </ListItemButton>
                  </ListItem>
                );
              }}
            </FixedSizeList>
          </Box>
        </div>
      )}

      {availableKeys.length > 0 && (
        <div className="data-selection">
          <div className="data-selection-header">
            <h3>값으로 사용할 열 선택</h3>
            <button
              className="closeBtn"
              onClick={() => {
                setAvailableKeys([]);
                setSelectedWidget(null);
                setSelectedTable(null);
                setShowDataSelection(false);
              }}
            >
              ×
            </button>
          </div>
          {availableKeys.map((key) => (
            <button
              key={key}
              className="dataSelectionBtn"
              onClick={() => handleKeySelect(key)}
            >
              {key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
