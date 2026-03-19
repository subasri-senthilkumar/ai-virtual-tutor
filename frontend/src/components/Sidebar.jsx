import { useState } from "react";

export default function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, onLogout, username }) {
  const [collapsed, setCollapsed] = useState(false);

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirm("Delete this conversation?")) onDelete(id);
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          {collapsed ? "▶" : "◀"}
        </button>
        {!collapsed && (
          <button className="new-chat-btn" onClick={onNew}>
            + New Chat
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
                <span className="conv-icon">💬</span>
                <span className="conv-title">{c.title || "New Chat"}</span>
                <button className="conv-delete" onClick={(e) => handleDelete(e, c.id)} title="Delete">
                  🗑️
                </button>
              </div>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="user-info">
              <span className="user-avatar">👤</span>
              <span className="user-name">{username}</span>
            </div>
            <button className="logout-btn" onClick={onLogout}>
              Sign Out
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
