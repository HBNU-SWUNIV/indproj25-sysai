import React, { useEffect, useMemo, useState } from "react";
import "./patient.css";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import axios from "axios";

/** ✅ 환자 컬럼: QR 관련(qrCodeValue/qrCodeUrl)만 제외하고 모두 표시 */
const patientColumns = [
  { field: "id", headerName: "ID", width: 80 },
  { field: "name", headerName: "이름", flex: 1, minWidth: 160 },
  {
    field: "active",
    headerName: "활성",
    width: 90,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: (p) => (p.value ? "✓" : ""),
  },
  { field: "birthDate", headerName: "생년월일", width: 140 },
  { field: "phone", headerName: "연락처", minWidth: 140, flex: 0.6 },
  { field: "emergencyPhone", headerName: "비상연락처", minWidth: 150, flex: 0.7 },
  { field: "emergencyContact", headerName: "비상연락자", minWidth: 140, flex: 0.6 },
];

/** ✅ API 베이스(ABS) */
const API_BASE =
  process.env.REACT_APP_FMDS_API_BASE ||
  "";

/** 공용 axios 인스턴스 */
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

const paginationModelDefault = { page: 0, pageSize: 5 };

export default function Patient() {
  // 서버 데이터
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // 선택/페이지/토스트
  const [selection, setSelection] = useState([]);
  const [paginationModel, setPaginationModel] = useState(paginationModelDefault);
  const [toast, setToast] = useState(null);

  // 추가 & 수정 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const emptyForm = {
    id: null,
    name: "",
    active: true,
    birthDate: "",
    phone: "",
    emergencyPhone: "",
    emergencyContact: "",
  };
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const columns = useMemo(() => patientColumns, []);

  /** 현재 페이지에 보이는 행들의 id (헤더 전체선택/삭제 범위 제한용) */
  const visiblePageIds = useMemo(() => {
    const { page, pageSize } = paginationModel;
    const start = page * pageSize;
    const end = start + pageSize;
    return rows.slice(start, end).map((r) => r.id);
  }, [rows, paginationModel]);

  /** 토스트 */
  const showToast = (msg, danger = false) => {
    setToast({ msg, danger });
    setTimeout(() => setToast(null), 1600);
  };

  /** 목록 로드 */
  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get("/patients");
      const list = Array.isArray(res.data) ? res.data : [];

      // QR 관련 필드는 제외하고 DataGrid 행으로 매핑
      const mapped = list.map((p) => ({
        id: p.id,
        name: p.name ?? "",
        active: !!p.active,
        birthDate: p.birthDate ?? "",
        phone: p.phone ?? "",
        emergencyPhone: p.emergencyPhone ?? "",
        emergencyContact: p.emergencyContact ?? "",
      }));

      setRows(mapped);
    } catch (err) {
      console.error("환자 목록 불러오기 실패:", err);
      showToast("환자 목록 불러오기 실패", true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  /** 추가 버튼 → 모달 열기 */
  const handleOpenCreate = () => {
    setCreateForm({ ...emptyForm, id: null });
    setCreateOpen(true);
  };

  /** 수정 버튼 → 모달 열기 (단일 선택만 허용) */
  const handleOpenEdit = () => {
    if (selection.length !== 1) return;
    const target = rows.find((r) => r.id === selection[0]);
    if (!target) return;
    setEditForm({
      id: target.id,
      name: target.name ?? "",
      active: !!target.active,
      birthDate: target.birthDate ?? "",
      phone: target.phone ?? "",
      emergencyPhone: target.emergencyPhone ?? "",
      emergencyContact: target.emergencyContact ?? "",
    });
    setEditOpen(true);
  };

  /** 환자 등록 (POST /patients) */
  const handleCreate = async () => {
    const name = (createForm.name || "").trim();
    if (!name) return showToast("이름을 입력하세요", true);

    const payload = {
      name,
      active: !!createForm.active,
      birthDate: createForm.birthDate || null,
      phone: createForm.phone || null,
      emergencyPhone: createForm.emergencyPhone || null,
      emergencyContact: createForm.emergencyContact || null,
    };

    try {
      await api.post("/patients", payload);
      setCreateOpen(false);
      showToast("환자 등록 완료");
      await fetchPatients(); // 서버 기준 재조회
    } catch (err) {
      console.error("환자 등록 실패:", err?.response?.data || err);
      showToast("환자 등록 실패", true);
    }
  };

  /** 환자 수정 (PUT /patients/{id}) */
  const handleEdit = async () => {
    if (!editForm.id) return;
    const payload = {
      name: (editForm.name || "").trim(),
      active: !!editForm.active,
      birthDate: editForm.birthDate || null,
      phone: editForm.phone || null,
      emergencyPhone: editForm.emergencyPhone || null,
      emergencyContact: editForm.emergencyContact || null,
    };
    if (!payload.name) return showToast("이름을 입력하세요", true);

    try {
      await api.put(`/patients/${encodeURIComponent(editForm.id)}`, payload);
      setEditOpen(false);
      showToast("수정 완료");
      await fetchPatients();
    } catch (err) {
      console.error("수정 실패:", err?.response?.data || err);
      showToast("수정 실패", true);
    }
  };

  /** 선택 삭제(복수) – 현재 페이지에서 보이는 항목으로만 */
  const handleDelete = async () => {
    const targetIds = selection.filter((id) => visiblePageIds.includes(id));

    if (targetIds.length === 0)
      return showToast("현재 페이지에서 선택된 항목이 없습니다.", true);

    if (!window.confirm(`${targetIds.length}건 삭제하시겠습니까? (현재 페이지 기준)`)) return;

    try {
      await Promise.all(
        targetIds.map((id) => api.delete(`/patients/${encodeURIComponent(id)}`))
      );
      showToast("삭제 완료");
      setSelection([]); // 선택 초기화
      await fetchPatients();
    } catch (err) {
      console.error("삭제 실패:", err?.response?.data || err);
      showToast("삭제 실패", true);
    }
  };

  return (
    <div className="patient">
      <h2>환자 관리</h2>

      {/* CRUD 툴바 */}
      <div className="toolbar">
        <button type="button" className="btn" onClick={handleOpenCreate}>
          + 추가
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={handleOpenEdit}
          disabled={selection.length !== 1}
          title="한 행만 선택 시 활성화"
        >
          수정
        </button>
        <button
          type="button"
          className="btn danger"
          onClick={handleDelete}
          disabled={selection.length === 0}
        >
          선택 삭제
        </button>
      </div>

      {/* 테이블 */}
      <Paper sx={{ height: 700, width: "100%", border: 0 }}>
        <DataGrid
          loading={loading}
          rows={rows}
          columns={columns}
          checkboxSelection
          // 현재 페이지에 보이는 행만 체크박스로 선택 가능
          isRowSelectable={(params) => visiblePageIds.includes(params.id)}
          disableRowSelectionOnClick
          paginationModel={paginationModel}
          onPaginationModelChange={(m) => {
            setPaginationModel(m);
            setSelection([]); // 페이지 전환 시 선택 초기화
          }}
          pageSizeOptions={[5, 10, 15]}
          rowSelectionModel={selection}
          onRowSelectionModelChange={(ids) => {
            // 현재 페이지에 보이는 행(visiblePageIds)만 선택 유지
            const filtered = ids.filter((id) => visiblePageIds.includes(id));
            setSelection(filtered);
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } },
          }}
          sx={{
            border: 0,
            color: "var(--text)",
            "& .MuiDataGrid-main": { bgcolor: "var(--surface)" },
            "& .MuiDataGrid-cell": { color: "var(--text)", borderColor: "var(--border)" },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "var(--surface-3)",
              borderBottom: "1px solid var(--border)",
              boxShadow: "inset 0 -1px 0 var(--border)",
            },
            "& .MuiDataGrid-iconSeparator": { color: "var(--border)", opacity: 1 },
            "& .MuiDataGrid-toolbarContainer": {
              p: 1,
              bgcolor: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              "& .MuiInputBase-root": { bgcolor: "var(--surface)", color: "var(--text)" },
            },
            "& .MuiDataGrid-row": {
              bgcolor: "var(--surface)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
              "&.Mui-selected, &.Mui-selected:hover": { bgcolor: "var(--primary-50)" },
            },
            "& .MuiButtonBase-root.MuiIconButton-root": { color: "var(--text)" },
            "& .MuiTablePagination-root": { color: "var(--text)" },
          }}
        />
      </Paper>

      {/* 추가 모달 */}
      {createOpen && (
        <div className="patient-modal-overlay" role="dialog" aria-modal="true">
          <div className="patient-modal">
            <div className="patient-modal-header">
              <h3>환자 추가</h3>
              <button className="closeBtn" onClick={() => setCreateOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>

            <div className="patient-modal-body">
              <label>
                이름
                <input
                  type="text"
                  placeholder="예) 홍길동"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label>
                생년월일
                <input
                  type="date"
                  value={createForm.birthDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </label>

              <label>
                연락처(본인)
                <input
                  type="text"
                  placeholder="예) 010-0000-0000"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>

              <label>
                비상연락처
                <input
                  type="text"
                  placeholder="예) 010-0000-0000"
                  value={createForm.emergencyPhone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, emergencyPhone: e.target.value }))
                  }
                />
              </label>

              <label>
                비상연락자 성명
                <input
                  type="text"
                  placeholder="예) 보호자 성명"
                  value={createForm.emergencyContact}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, emergencyContact: e.target.value }))
                  }
                />
              </label>

              <label className="row">
                <input
                  type="checkbox"
                  checked={!!createForm.active}
                  onChange={(e) => setCreateForm((f) => ({ ...f, active: e.target.checked }))}
                />
                <span>활성 상태</span>
              </label>

              <p className="hint">
                저장 시 서버에서 QR 값이 생성되지만, 목록에는 표시하지 않습니다.
              </p>
            </div>

            <div className="patient-modal-actions">
              <button className="btn secondary" onClick={() => setCreateOpen(false)}>
                취소
              </button>
              <button className="btn" onClick={handleCreate}>
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 */}
      {editOpen && (
        <div className="patient-modal-overlay" role="dialog" aria-modal="true">
          <div className="patient-modal">
            <div className="patient-modal-header">
              <h3>환자 정보 수정</h3>
              <button className="closeBtn" onClick={() => setEditOpen(false)} aria-label="닫기">
                ×
              </button>
            </div>

            <div className="patient-modal-body">
              <label>
                이름
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>

              <label>
                생년월일
                <input
                  type="date"
                  value={editForm.birthDate || ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </label>

              <label>
                연락처(본인)
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>

              <label>
                비상연락처
                <input
                  type="text"
                  value={editForm.emergencyPhone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, emergencyPhone: e.target.value }))
                  }
                />
              </label>

              <label>
                비상연락자 성명
                <input
                  type="text"
                  value={editForm.emergencyContact}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, emergencyContact: e.target.value }))
                  }
                />
              </label>

              <label className="row">
                <input
                  type="checkbox"
                  checked={!!editForm.active}
                  onChange={(e) => setEditForm((f) => ({ ...f, active: e.target.checked }))}
                />
                <span>활성 상태</span>
              </label>
            </div>

            <div className="patient-modal-actions">
              <button className="btn secondary" onClick={() => setEditOpen(false)}>
                취소
              </button>
              <button className="btn" onClick={handleEdit}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div
          className="toast"
          style={{ borderColor: toast.danger ? "var(--danger)" : "var(--border)" }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
