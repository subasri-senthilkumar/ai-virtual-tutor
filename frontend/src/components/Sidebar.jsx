import { useState, useEffect, useRef } from "react";
import { FiTrash2, FiUser, FiLogOut, FiChevronLeft, FiChevronRight, FiPlusCircle } from "react-icons/fi";

const COLLAPSE_BREAKPOINT = 768;

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onLogout, username }) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < COLLAPSE_BREAKPOINT);
  const userToggledRef = useRef(false);

  const toggle = () => {
    userToggledRef.current = true;
    setCollapsed((v) => !v);
  };

  useEffect(() => {
    const onResize = () => {
      if (!userToggledRef.current) {
        setCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) onDelete(id);
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <button className="sidebar-toggle" onClick={toggle} title="Toggle sidebar">
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
        {!collapsed && (
          <button className="new-chat-btn" onClick={onNew}>
            <FiPlusCircle size={15} style={{ marginRight: 6 }} /> New Chat
          </button>
        )} 
      </div>

      {!collapsed && (
        <>
          <div className="conversation-list">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={`conversation-item ${c.id === activeId ? "active" : ""}`}
                onClick={() => onSelect(c.id)}
              >
                <span className="conv-title">{c.title || "New Chat"}</span>
                <button className="conv-delete" onClick={(e) => handleDelete(e, c.id)} title="Delete">
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="user-info">
              <span className="user-avatar"><FiUser size={16} /></span>
              <span className="user-name">{username}</span>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              <FiLogOut size={14} style={{ marginRight: 6 }} /> Sign Out
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
