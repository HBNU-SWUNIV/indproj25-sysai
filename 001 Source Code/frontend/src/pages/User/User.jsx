// frontend/src/pages/User/User.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./user.css";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import axios from "axios";

/** 컬럼: ID / 이름 / 관리자 / 역할 / 이메일 / 연락처 */
const userColumns = [
  { field: "id", headerName: "ID", width: 80 },
  { field: "name", headerName: "이름", flex: 1, minWidth: 160 },
  {
    field: "admin",
    headerName: "관리자",
    width: 90,
    align: "center",
    headerAlign: "center",
    sortable: false,
    renderCell: (p) => (p.value ? "✓" : ""),
  },
  { field: "role", headerName: "역할", width: 120 },
  { field: "email", headerName: "이메일", flex: 1, minWidth: 200 },
  { field: "phone", headerName: "연락처", width: 140 },
];

const API_BASE =
  process.env.REACT_APP_FMDS_API_BASE ||
  "";

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
});

const paginationModelDefault = { page: 0, pageSize: 10 };

export default function User() {
  // 서버 데이터
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // 선택/페이지/토스트
  const [selection, setSelection] = useState([]);
  const [paginationModel, setPaginationModel] = useState(paginationModelDefault);
  const [toast, setToast] = useState(null);

  // 추가 모달
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    role: "user",
    email: "",
    phone: "",
  });

  // 수정 모달
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    role: "user",
    email: "",
    phone: "",
  });

  const columns = useMemo(() => userColumns, []);

  /** 현재 페이지에 보이는 행들의 id (삭제 타겟 제한용) */
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
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/data/users");
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((u) => ({
        id: u.id,
        name: u.name ?? "",
        admin: !!u.admin,
        role: u.role ?? "",
        email: u.email ?? "",
        phone: u.phone ?? "",
      }));
      setRows(mapped);
    } catch (err) {
      console.error("유저 전체 조회 실패:", err);
      showToast("유저 목록 불러오기 실패", true);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  /** 추가 버튼 → 모달 열기 */
  const handleOpenCreate = () => {
    setCreateForm({
      name: "",
      role: "user",
      email: "",
      phone: "",
    });
    setCreateOpen(true);
  };

  /** 유저 등록 */
  const handleCreate = async () => {
    const name = (createForm.name || "").trim();
    const role = (createForm.role || "user").trim();
    const email = (createForm.email || "").trim();
    const phone = (createForm.phone || "").trim();
    const admin = role.toLowerCase() === "admin";

    if (!name) return showToast("이름을 입력하세요", true);
    if (!role) return showToast("역할을 선택하세요", true);

    const payload = { name, role, admin, email, phone };

    try {
      await api.post("/data/user", payload);
      setCreateOpen(false);
      showToast("유저 등록 완료");
      await fetchUsers();
    } catch (err) {
      console.error("유저 등록 실패:", err?.response?.data || err);
      showToast("유저 등록 실패", true);
    }
  };

  /** 선택 삭제(복수) – 현재 페이지에서 보이는 항목으로 제한 */
  const handleDelete = async () => {
    // 현재 페이지에서 선택된 것만 추려서 삭제
    const targetIds = selection;

    if (targetIds.length === 0) {
      return showToast("현재 페이지에서 선택된 항목이 없습니다.", true);
    }
    if (!window.confirm(`${targetIds.length}건 삭제하시겠습니까?`))
      return;

    try {
      await Promise.all(
        targetIds.map((id) =>
          api.delete(`/data/user/${encodeURIComponent(id)}`)
        )
      );
      showToast("삭제 완료");
      setSelection([]); // 선택 초기화
      await fetchUsers();
    } catch (err) {
      console.error("삭제 실패:", err?.response?.data || err);
      showToast("삭제 실패", true);
    }
  };

  /** 수정 버튼 → 선택 1건 불러오기 & 모달 열기 */
  const handleOpenEdit = async () => {
    if (selection.length !== 1)
      return showToast("수정할 한 명을 선택하세요", true);

    const id = selection[0];
    try {
      const res = await api.get(`/data/user/${encodeURIComponent(id)}`);
      const u = res.data || {};
      setEditId(id);
      setEditForm({
        name: u.name ?? "",
        role: u.role ?? "user",
        email: u.email ?? "",
        phone: u.phone ?? "",
      });
      setEditOpen(true);
    } catch (err) {
      console.error("유저 단건 조회 실패:", err?.response?.data || err);
      showToast("유저 정보 불러오기 실패", true);
    }
  };

  /** 유저 수정 (name/role/email/phone; admin은 role로 자동결정) */
  const handleEdit = async () => {
    if (!editId) return;

    const name = (editForm.name || "").trim();
    const role = (editForm.role || "user").trim();
    const email = (editForm.email || "").trim();
    const phone = (editForm.phone || "").trim();
    const admin = role.toLowerCase() === "admin";

    if (!name) return showToast("이름을 입력하세요", true);
    if (!role) return showToast("역할을 선택하세요", true);

    const body = { name, role, admin, email, phone };

    try {
      await api.put(`/data/user/${encodeURIComponent(editId)}`, body);
      setEditOpen(false);
      setEditId(null);
      showToast("수정 완료");
      await fetchUsers();
    } catch (err) {
      console.error("유저 수정 실패:", err?.response?.data || err);
      showToast("유저 수정 실패", true);
    }
  };

  return (
    <div className="user">
      <h2>유저 관리</h2>

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
      <Paper sx={{ height: 720, width: "100%", border: 0 }}>
        <DataGrid
          loading={loading}
          rows={rows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          paginationModel={paginationModel}
          onPaginationModelChange={(m) => {
            setPaginationModel(m);
            setSelection([]); // 페이지 바뀌면 선택 초기화(혼동 방지)
          }}
          pageSizeOptions={[10, 20, 30]}
          rowSelectionModel={selection}
          onRowSelectionModelChange={(ids) => {
            // 헤더 '전체 선택'을 눌러도 현재 페이지에 보이는 행만 선택
            const onlyThisPage = ids.filter((id) => visiblePageIds.includes(id));
            setSelection(onlyThisPage);
          }}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 300 },
            },
          }}
          sx={{
            border: 0,
            color: "var(--text)",
            "& .MuiDataGrid-main": { bgcolor: "var(--surface)" },
            "& .MuiDataGrid-cell": {
              color: "var(--text)",
              borderColor: "var(--border)",
            },
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "var(--surface-3)",
              borderBottom: "1px solid var(--border)",
              boxShadow: "inset 0 -1px 0 var(--border)",
            },
            "& .MuiDataGrid-iconSeparator": {
              color: "var(--border)",
              opacity: 1,
            },
            "& .MuiDataGrid-toolbarContainer": {
              p: 1,
              bgcolor: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
              "& .MuiInputBase-root": {
                bgcolor: "var(--surface)",
                color: "var(--text)",
              },
            },
            "& .MuiDataGrid-row": {
              bgcolor: "var(--surface)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.03)" },
              "&.Mui-selected, &.Mui-selected:hover": {
                bgcolor: "var(--primary-50)",
              },
            },
            "& .MuiButtonBase-root.MuiIconButton-root": { color: "var(--text)" },
            "& .MuiTablePagination-root": { color: "var(--text)" },
          }}
        />
      </Paper>

      {/* ■■■ 유저 추가 모달 (admin 체크박스 제거) ■■■ */}
      {createOpen && (
        <div className="user-modal-overlay" role="dialog" aria-modal="true">
          <div className="user-modal">
            <div className="user-modal-header">
              <h3>유저 추가</h3>
              <button
                className="closeBtn"
                onClick={() => setCreateOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="user-modal-body">
              <label>
                이름
                <input
                  type="text"
                  placeholder="예) 홍길동"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </label>

              <label>
                역할(role)
                <select
                  value={createForm.role}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                {/* admin 값은 role === 'admin' 으로 자동 결정됩니다. */}
              </label>

              <label>
                이메일
                <input
                  type="email"
                  placeholder="예) user@example.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>

              <label>
                연락처
                <input
                  type="text"
                  placeholder="예) 010-0000-0000"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="user-modal-actions">
              <button
                className="btn secondary"
                onClick={() => setCreateOpen(false)}
              >
                취소
              </button>
              <button className="btn" onClick={handleCreate}>
                등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ■■■ 유저 수정 모달 (admin 체크박스 제거) ■■■ */}
      {editOpen && (
        <div className="user-modal-overlay" role="dialog" aria-modal="true">
          <div className="user-modal">
            <div className="user-modal-header">
              <h3>유저 수정</h3>
              <button
                className="closeBtn"
                onClick={() => setEditOpen(false)}
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="user-modal-body">
              <label>
                이름
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </label>

              <label>
                역할(role)
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                {/* admin 값은 role === 'admin' 으로 자동 결정됩니다. */}
              </label>

              <label>
                이메일
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </label>

              <label>
                연락처
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </label>
            </div>

            <div className="user-modal-actions">
              <button
                className="btn secondary"
                onClick={() => setEditOpen(false)}
              >
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
          style={{
            borderColor: toast.danger ? "var(--danger)" : "var(--border)",
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
