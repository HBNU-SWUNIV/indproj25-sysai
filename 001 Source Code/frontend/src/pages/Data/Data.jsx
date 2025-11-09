import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import axios from "axios";
import "./data.css";

export default function Data() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileNames, setFileNames] = useState([]);
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [newRow, setNewRow] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);

  // 서버에서 파일 목록 불러오기
  useEffect(() => {
    const fetchFileList = async () => {
      try {
        const res = await axios.get(
          ""
        );
        if (Array.isArray(res.data)) setFileNames(res.data);
      } catch (err) {
        console.error("서버에서 파일 목록 불러오기 실패:", err);
      }
    };
    fetchFileList();
  }, []);

  // 파일 업로드
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.replace(/\.[^/.]+$/, "");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        "",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      alert("엑셀 업로드 성공");
      setFileNames((prev) => [...prev, fileName]);
      fetchFileData(fileName);
    } catch (error) {
      console.error("엑셀 업로드 실패:", error);
      alert("엑셀 업로드 실패");
    }
  };

  // 파일 데이터 불러오기
  const fetchFileData = async (fileName) => {
    try {
      const encodedFileName = encodeURIComponent(fileName);
      const res = await axios.get(
        ``
      );
      const raw = res.data;

      if (!Array.isArray(raw) || raw.length === 0) {
        alert("서버에 데이터가 없습니다.");
        return;
      }

      const sample = raw[0];
      const data = sample.fields ? raw.map((r) => r.fields) : raw;
      const headers = Object.keys(data[0]);

      const rows = data.map((item, idx) => {
        const row = { id: idx + 1 };
        headers.forEach((h) => (row[h] = item[h]));
        return row;
      });

      setSelectedFile(fileName);
      setColumns(headers.map((h) => ({ field: h, headerName: h, flex: 1 })));
      setTableData(rows);
      setNewRow(new Array(headers.length).fill(""));
      setSelectedRows([]);
    } catch (error) {
      console.error("서버 데이터 불러오기 실패:", error);
      alert("데이터 불러오기 중 오류가 발생했습니다.");
    }
  };

  // 새 행 입력 변경
  const handleInputChange = (index, value) => {
    const updated = [...newRow];
    updated[index] = value;
    setNewRow(updated);
  };

  // 행 추가
  const handleAddRow = () => {
    const obj = { id: tableData.length + 1 };
    columns.forEach((col, i) => {
      obj[col.field] = newRow[i] || "";
    });
    setTableData((prev) => [...prev, obj]);
    setNewRow(new Array(columns.length).fill(""));
  };

  // 행 삭제
  const handleDeleteRows = () => {
    if (selectedRows.length === 0) return;
    const updated = tableData.filter((row) => !selectedRows.includes(row.id));
    setTableData(updated);
    setSelectedRows([]);
  };

  // 엑셀 내보내기
  const handleExportToExcel = () => {
    if (!selectedFile || tableData.length === 0) return;

    const headers = columns.map((col) => col.field);
    const rows = tableData.map((row) => headers.map((h) => row[h]));

    const aoa = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    const fileName = `${selectedFile}_export.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="data">
      {/* 페이지 제목 (환경설정과 동일 톤) */}
      <header className="page-header">
        <h2 className="page-title">Data</h2>
      </header>

      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileUpload}
        className="file-input"
      />

      <div className="file-buttons">
        {fileNames.map((file) => (
          <button
            key={file}
            className={`file-button ${selectedFile === file ? "active" : ""}`}
            onClick={() => fetchFileData(file)}
          >
            {file}
          </button>
        ))}
      </div>

      {selectedFile && (
        <>
          <Paper
            sx={{
              height: "auto",
              width: "auto",
              mt: 2,
              backgroundColor: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              boxShadow: "none",
            }}
          >
            <DataGrid
              rows={tableData}
              columns={columns}
              checkboxSelection
              disableRowSelectionOnClick
              onRowSelectionModelChange={(model) => setSelectedRows(model)}
              sx={{
                width: "100%",
                height: "100%",
                border: 0,
                color: "var(--text)",
                "--DataGrid-containerBackground": "var(--surface)",
                "& .MuiDataGrid-columnHeaders": {
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text)",
                  borderBottom: "1px solid var(--border)",
                },
                "& .MuiDataGrid-cell": {
                  color: "var(--text)",
                  borderColor: "var(--border)",
                },
                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "var(--primary-50)",
                },
                "& .MuiDataGrid-footerContainer": {
                  backgroundColor: "var(--surface-2)",
                  color: "var(--text)",
                  borderTop: "1px solid var(--border)",
                },
                "& .MuiCheckbox-root": { color: "var(--text-muted)" },
                "& .MuiSvgIcon-root": { color: "var(--text)" },
                "& .MuiTablePagination-root, & .MuiTablePagination-toolbar, & .MuiTablePagination-selectLabel, & .MuiTablePagination-input":
                  { color: "var(--text)" },
              }}
            />
          </Paper>

          <div className="add-row-form">
            {columns.map((col, i) => (
              <input
                key={i}
                type="text"
                placeholder={col.field}
                value={newRow[i] || ""}
                onChange={(e) => handleInputChange(i, e.target.value)}
              />
            ))}
            <button onClick={handleAddRow} disabled={columns.length === 0}>
              행 추가
            </button>
          </div>

          <div className="export-section">
            <button
              className="export-button"
              onClick={handleExportToExcel}
              disabled={tableData.length === 0}
            >
              엑셀로 내보내기
            </button>
            <button
              className="delete-button"
              onClick={handleDeleteRows}
              disabled={selectedRows.length === 0}
            >
              선택한 행 삭제
            </button>
          </div>
        </>
      )}
    </div>
  );
}
