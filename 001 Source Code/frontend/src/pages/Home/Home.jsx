import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import DynamicPieChart from "components/chart/PieChart";
import DynamicAreaChart from "components/chart/SimpleAreaChart";
import DynamicBarChart from "components/chart/SimpleBarChart";
import DynamicLineChart from "components/chart/SimpleLineChart";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import axios from "axios";
import "./home.css";
import PluginRenderer from "components/plugin/PluginRenderer";

const ResponsiveGridLayout = WidthProvider(Responsive);
const userId = 54;

export default function Home() {
  const [templates, setTemplates] = useState({});
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [tableData, setTableData] = useState({});
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const pendingModelUpdatesRef = React.useRef(new Set());
  const [selectedTemplateName, setSelectedTemplateName] = useState(null);
  const [pluginChartTypes, setPluginChartTypes] = useState([]);

  // memoized WidgetContent (identical to Dashboard)
  const WidgetContent = React.useMemo(
    () =>
      React.memo(
        function WidgetContent({ widgetInfo, widgetId, item, renderChart, reloadKey }) {
          console.log("[HOME WidgetContent render]", { widgetId, chart: widgetInfo?.chart, reloadKey });
          if (!widgetInfo) {
            return <div className="widget-content">차트 없음</div>;
          }
          return (
            <div className="widget-content">
              {renderChart(widgetInfo, item, reloadKey)}
            </div>
          );
        },
        (prev, next) =>
          prev.widgetInfo === next.widgetInfo &&
          prev.widgetId === next.widgetId &&
          prev.item === next.item &&
          prev.reloadKey === next.reloadKey
      ),
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 파일명 목록
    const fetchAllFileNameList = async () => {
      try {
        const res = await axios.get(
          ""
        );
        if (Array.isArray(res.data)) {
          for (const fileName of res.data) {
            await fetchTableData(fileName);
          }
        }
      } catch (err) {
        console.error("엑셀 목록 불러오기 실패:", err);
      }
    };

    const fetchAllData = async () => {
      try {
        const [fileListRes, templateListRes, pluginTypesRes] =
          await Promise.all([
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

        await Promise.all(fileListRes.data.map(fetchTableData));
        await Promise.all(
          templateListRes.data.map((t) => fetchTemplatesData(t.id))
        );

        setPluginChartTypes(pluginTypesRes.data || []);
        console.log(
          "✅ 플러그인 차트 목록:",
          (pluginTypesRes.data || []).map((p) => p._id)
        );
      } catch (err) {
        console.error("데이터 불러오기 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    const fetchAllTemplatesList = async () => {
      try {
        const res = await axios.get(
          ``
        );
        res.data.forEach((template) => fetchTemplatesData(template.id));
      } catch (err) {
        console.error("템플릿 전체 불러오기 실패:", err);
      }
    };

    const fetchPluginChartTypes = async () => {
      try {
        const res = await axios.get(
          ""
        );
        setPluginChartTypes(res.data);
        console.log(
          "✅ 플러그인 차트 목록:",
          res.data.map((p) => p._id)
        );
      } catch (err) {
        console.error("❌ 플러그인 차트 불러오기 실패:", err);
      }
    };

    fetchAllFileNameList();
    fetchAllTemplatesList();
    fetchPluginChartTypes();
    fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // WebSocket 연결: 실시간 데이터 수신 (pose_events, Dashboard와 동일)
  useEffect(() => {
    const CONNECT_URL = "";
    const ws = new WebSocket(CONNECT_URL);

    ws.onopen = () => {
      console.log("✅ Home WebSocket connected:", CONNECT_URL);
      ws.send(JSON.stringify({ type: "subscribe", modelType: "pose_events" }));
    };

    ws.onmessage = (event) => {
      try {
        const text = typeof event.data === "string" ? event.data : "";
        const msg = text ? JSON.parse(text) : {};

        const isUpdate =
          (msg && msg.type === "update") ||
          (msg && msg.event === "update");

        if (!isUpdate || !msg.modelType) return;

        if (msg.modelType === "pose_events") {
          console.log("[HOME WS] pose_events update:", msg);

          if (!ws._poseTickTimer) {
            ws._poseTickTimer = setTimeout(() => {
              setReloadTrigger((n) => n + 1);
              ws._poseTickTimer = null;
            }, 100);
          }

          pendingModelUpdatesRef.current.add("pose_events");
        }

        if (Array.isArray(msg.data)) {
          setTableData((prev) => ({
            ...prev,
            [msg.modelType]: msg.data,
          }));
        }
      } catch (err) {
        console.error("⚠️ Home WS parse error:", err);
      }
    };

    ws.onerror = (err) => console.error("Home WS error:", err);
    ws.onclose = () => console.log("Home WS closed");

    return () => ws.close();
  }, []);

  const fetchTableData = async (fileName) => {
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
    } catch (err) {
      console.error(`${fileName} 데이터 불러오기 실패:`, err);
    }
  };

  const fetchTemplatesData = async (templateId) => {
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

      const templateName =
        components[0]?.userList?.name || `템플릿_${templateId}`;

      setTemplates((prev) => ({
        ...prev,
        [templateName]: { id: templateId, layout, widgets },
      }));
    } catch (err) {
      // console.error("템플릿 불러오기 실패:", err);
    }
  };

  function PluginChartRenderer({ pluginInstance, widgetSize, reloadTrigger }) {
    const [Plugincode, setPluginCode] = useState("");
    const [pluginData, setPluginData] = useState([]);
    const [pluginOptions, setPluginOptions] = useState({});

    useEffect(() => {
      if (!pluginInstance) return;
      let alive = true;

      const loadPlugin = async () => {
        try {
          const instanceId = pluginInstance._id;
          const pluginTypeId = pluginInstance.typeId;

          const res1 = await axios.get(
            ``
          );
          if (!alive) return;
          setPluginCode(res1.data.rendererCode || "");

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
          if (!alive) return;
          setPluginData(processedData);

          const res3 = await axios.get(
            ``
          );
          if (!alive) return;
          setPluginOptions(res3.data?.options || {});
        } catch (e) {
          console.error("플러그인 로드 실패:", e);
        }
      };

      loadPlugin();
      return () => {
        alive = false;
      };
    }, [pluginInstance, reloadTrigger]);

    // ✅ 카드 중앙 정렬 & 레전드 여백 보정을 위한 높이 보정
    const chartPaddingY = 32; // 레전드/상하 숨쉬기 공간
    const width = Math.max(100, Math.round(widgetSize.w * 100));
    const height = Math.max(50, Math.round(widgetSize.h * 50) - chartPaddingY);

    return (
      <div className="chart-host">
        {Plugincode && (
          <PluginRenderer
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

  // 카메라 영상 스트리밍 (Dashboard와 동일)
  function CameraStream({ widgetSize }) {
    const canvasRef = React.useRef(null);
    const wsRef = React.useRef(null);

    React.useEffect(() => {
      const ws = new WebSocket("ws://localhost:8000/ws");
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

      ws.onerror = (err) => {
        console.error("Camera WS error:", err);
      };

      return () => {
        destroyed = true;
        try {
          ws.close();
        } catch (_) {}
      };
    }, []);

    const chartPaddingY = 16;
    const width = Math.max(100, Math.round(widgetSize.w * 100));
    const height = Math.max(50, Math.round(widgetSize.h * 50) - chartPaddingY);

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

  const renderChart = (widgetInfo, widgetSize, reloadKey = 0) => {
    const isPluginChart = pluginChartTypes.some(
      (plugin) => plugin._id === widgetInfo.chart
    );
    if (isPluginChart) {
      const pluginInstance = pluginChartTypes.find(
        (plugin) => plugin._id === widgetInfo.chart
      );
      return (
        <PluginChartRenderer
          pluginInstance={pluginInstance}
          widgetSize={widgetSize}
          reloadTrigger={reloadKey}
        />
      );
    }

    // 카메라
    if (widgetInfo.chart === "Camera") {
      return <CameraStream widgetSize={widgetSize} />;
    }

    if (!widgetInfo || !widgetInfo.file || !widgetInfo.chart) return null;
    const rawData = tableData[widgetInfo.file];
    if (!rawData || rawData.length < 2) return <p>유효한 데이터가 없습니다.</p>;

    const header = rawData[0];
    const rows = rawData.slice(1);

    // ✅ 중앙 정렬을 위한 실제 차트 높이 보정
    const chartPaddingY = 32; // 레전드/상하 여백
    const width = Math.max(100, Math.round(widgetSize.w * 100));
    const height = Math.max(50, Math.round(widgetSize.h * 50) - chartPaddingY);

    const parsedData = rows.map((row) => {
      const obj = { name: row[0] };
      for (let i = 1; i < header.length; i++) {
        obj[header[i]] = Number(row[i]) || 0;
      }
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

  if (loading) return <p>데이터 로딩 중...</p>;

  return (
    <div className="home">
      <h2>HOME</h2>
      {Object.keys(templates).length === 0 && <p>저장된 템플릿이 없습니다.</p>}

      <div style={{ marginBottom: 12 }}>
        {Object.entries(templates).map(([name, config]) => (
          <button
            key={name}
            className={`templateBtn ${
              selectedTemplateName === name ? "active" : ""
            }`}
            onClick={() => {
              setSelectedTemplate(config);
              setSelectedTemplateName(name);
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: selectedTemplate.layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
          isDraggable={false}
          isResizable={false}
          rowHeight={50}
        >
          {selectedTemplate.layout.map((item) => {
            const widget = selectedTemplate.widgets[item.i];
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
              <div key={item.i} className="widget no-border">
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
      )}
    </div>
  );
}
