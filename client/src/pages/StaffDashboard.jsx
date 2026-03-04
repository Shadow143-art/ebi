import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import StaffLayout from "../layouts/StaffLayout";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../realtime/socket";

const StaffDashboard = () => {
  const { logout, token, user } = useAuth();
  const [filters, setFilters] = useState({ name: "", skill: "", department: "", year: "" });
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [requestStatus, setRequestStatus] = useState("");
  const [acceptedContacts, setAcceptedContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [unreadByContact, setUnreadByContact] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const socketRef = useRef(null);
  const selectedContactRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);

  const certificationLabel = (item) =>
    typeof item === "string" ? item : String(item?.title || "").trim();
  const certificationFile = (item) =>
    typeof item === "string" ? "" : String(item?.fileUrl || "").trim();

  const openCertificateFile = (fileUrl) => {
    if (!fileUrl) return;
    if (fileUrl.startsWith("data:")) {
      const [meta, data] = fileUrl.split(",");
      const mimeMatch = meta.match(/data:(.*?);base64/);
      const mimeType = mimeMatch?.[1] || "application/octet-stream";
      const byteChars = atob(data || "");
      const byteNumbers = new Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i += 1) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }
    window.open(fileUrl, "_blank", "noopener,noreferrer");
  };

  const loadAcceptedContacts = async () => {
    const { data } = await api.get("/staff-contact/accepted");
    setAcceptedContacts(data.contacts || []);
  };

  const parseUnreadSummary = (payload) => {
    const next = {};
    (payload?.byContact || []).forEach((entry) => {
      const contactId = String(entry?.contactId || "");
      const count = Number(entry?.count || 0);
      if (contactId && count > 0) {
        next[contactId] = count;
      }
    });
    return next;
  };

  const applyUnreadSummary = (payload) => {
    setUnreadByContact(parseUnreadSummary(payload));
  };

  const fetchUnreadSummary = async () => {
    try {
      const { data } = await api.get("/messages/unread");
      applyUnreadSummary(data);
      return data;
    } catch {
      return null;
    }
  };

  const search = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v.trim()) params.set(k, v.trim());
    });
    const { data } = await api.get(`/staff/students?${params.toString()}`);
    setStudents(data.students || []);
  };

  useEffect(() => {
    const run = async () => {
      await Promise.all([search(), loadAcceptedContacts(), fetchUnreadSummary()]);
    };
    run();
  }, []);

  const selectStudent = async (id) => {
    const { data } = await api.get(`/staff/students/${id}`);
    setSelected(data.profile);
    setRequestStatus("");
  };

  const sendContactRequest = async () => {
    if (!selected || !message.trim()) return;
    try {
      const { data } = await api.post("/staff-contact/request", {
        studentUserId: selected.user._id,
        note: message
      });
      setRequestStatus(data.message || "Contact request sent.");
      setMessage("");
      await loadAcceptedContacts();
    } catch (err) {
      setRequestStatus(err.response?.data?.message || "Could not send contact request.");
    }
  };

  useEffect(() => {
    if (!selectedContact?._id) return;

    const run = async () => {
      try {
        const { data } = await api.get(`/messages/${selectedContact._id}`);
        setChatMessages(data.messages || []);
        setChatStatus("");
        const contactId = String(selectedContact._id);
        setUnreadByContact((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
        await fetchUnreadSummary();
      } catch (err) {
        setChatMessages([]);
        setChatStatus(err.response?.data?.message || "Unable to open conversation.");
      }
    };
    run();
  }, [selectedContact]);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
    setIsPeerTyping(false);
    if (selectedContact?._id) {
      const contactId = String(selectedContact._id);
      setUnreadByContact((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
    }
  }, [selectedContact]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, selectedContact]);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    if (!socket) return;
    socketRef.current = socket;

    const onOnlineUsers = (payload) => {
      setOnlineUsers(payload?.users || []);
    };

    const onNewMessage = ({ message }) => {
      if (!message) return;
      const activeContact = selectedContactRef.current;
      const activeId = activeContact?._id ? String(activeContact._id) : "";
      const from = String(message.from || "");
      const to = String(message.to || "");
      const inActiveConversation = activeId && (from === activeId || to === activeId);

      if (inActiveConversation) {
        setChatMessages((prev) =>
          prev.some((m) => String(m._id) === String(message._id)) ? prev : [...prev, message]
        );
        setIsPeerTyping(false);
        if (from) {
          setUnreadByContact((prev) => (prev[from] ? { ...prev, [from]: 0 } : prev));
        }
        if (from && from !== String(user?.id || "")) {
          api
            .post(`/messages/read/${from}`)
            .then(({ data }) => applyUnreadSummary(data))
            .catch(() => {});
        }
        return;
      }

      if (from && from !== String(user?.id || "")) {
        setUnreadByContact((prev) => ({ ...prev, [from]: (prev[from] || 0) + 1 }));
      }
    };

    const onTypingStart = ({ from }) => {
      const activeContact = selectedContactRef.current;
      if (!activeContact?._id) return;
      if (String(from) === String(activeContact._id)) {
        setIsPeerTyping(true);
      }
    };

    const onTypingStop = ({ from }) => {
      const activeContact = selectedContactRef.current;
      if (!activeContact?._id) return;
      if (String(from) === String(activeContact._id)) {
        setIsPeerTyping(false);
      }
    };

    const onUnreadSummary = (payload) => {
      applyUnreadSummary(payload || {});
    };

    socket.on("online:users", onOnlineUsers);
    socket.on("message:new", onNewMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:unread", onUnreadSummary);

    return () => {
      socket.off("online:users", onOnlineUsers);
      socket.off("message:new", onNewMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:unread", onUnreadSummary);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [token, user?.id]);

  const openConversation = (contact) => {
    setSelectedContact(contact || null);
    if (contact?._id) {
      const contactId = String(contact._id);
      setUnreadByContact((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
    }
  };

  const unreadCount = useMemo(
    () => Object.values(unreadByContact).reduce((sum, value) => sum + Number(value || 0), 0),
    [unreadByContact]
  );

  const markAllMessagesAsRead = async () => {
    try {
      const { data } = await api.post("/messages/read-all");
      applyUnreadSummary(data);
      setChatStatus("All messages marked as read.");
    } catch (err) {
      setChatStatus(err.response?.data?.message || "Unable to mark messages as read.");
    }
  };

  const sendChat = async () => {
    if (!selectedContact?._id || !chatText.trim()) return;
    try {
      socketRef.current?.emit("typing:stop", { to: selectedContact._id });
      const { data } = await api.post("/messages", {
        to: selectedContact._id,
        body: chatText
      });
      setChatMessages((prev) => [...prev, data.message]);
      setChatText("");
      setChatStatus("");
    } catch (err) {
      setChatStatus(err.response?.data?.message || "Unable to send message.");
    }
  };

  return (
    <StaffLayout onLogout={logout}>
      <div className="panel dashboard-shell-head staff-head">
        <div className="dashboard-head-copy">
          <span className="hero-chip">Tracker Staff Hub</span>
          <h2>Staff Command Center</h2>
          <p>Search student talent, review complete profiles, and manage approved communication.</p>
        </div>
        <div className="dashboard-metrics">
          <div className="metric-card">
            <small>Results Loaded</small>
            <strong>{students.length}</strong>
          </div>
          <div className="metric-card">
            <small>Accepted Contacts</small>
            <strong>{acceptedContacts.length}</strong>
          </div>
          <div className="metric-card">
            <small>Unread Messages</small>
            <strong>{unreadCount}</strong>
          </div>
        </div>
      </div>

      <div className="panel search-panel">
        <div className="input-grid">
          <label>
            Name
            <input value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
          </label>
          <label>
            Skill
            <input value={filters.skill} onChange={(e) => setFilters((p) => ({ ...p, skill: e.target.value }))} />
          </label>
          <label>
            Department
            <input
              value={filters.department}
              onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
            />
          </label>
          <label>
            Year
            <input value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))} />
          </label>
        </div>
        <button className="primary-btn" onClick={search} type="button">
          Search Students
        </button>
      </div>

      <div className="staff-grid">
        <div className="panel">
          <h3>Student Results</h3>
          <div className="list-block">
            {students.map((s) => (
              <button key={s._id} className="staff-result" onClick={() => selectStudent(s._id)} type="button">
                <strong>{s.user?.name || s.user?.username}</strong>
                <small>{s.department} {s.year ? `- ${s.year}` : ""}</small>
                <small>{(s.skills || []).slice(0, 4).join(", ")}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Student Profile</h3>
          {!selected ? (
            <p>Select a student to view full profile.</p>
          ) : (
            <div className="profile-view">
              <img
                className="avatar-lg"
                src={selected.photoUrl || "https://via.placeholder.com/160x160.png?text=Student"}
                alt="student"
              />
              <h4>{selected.user?.name || selected.user?.username}</h4>
              <p>{selected.bio || "No bio"}</p>
              <p>
                <strong>Department:</strong> {selected.department || "N/A"}
              </p>
              <p>
                <strong>Year:</strong> {selected.year || "N/A"}
              </p>
              <p>
                <strong>Contact Number:</strong> {selected.contactNumber || "N/A"}
              </p>
              <p>
                <strong>Skills:</strong> {(selected.skills || []).join(", ") || "N/A"}
              </p>
              <p>
                <strong>Projects:</strong> {(selected.projects || []).join(", ") || "N/A"}
              </p>
              <p>
                <strong>Certifications:</strong>{" "}
                {(selected.certifications || [])
                  .map((item) => certificationLabel(item))
                  .filter(Boolean)
                  .join(", ") || "N/A"}
              </p>
              <div className="list-block">
                {(selected.certifications || []).map((item, idx) => (
                  <div className="list-item" key={`staff-cert-${idx}`}>
                    <div>
                      <strong>{certificationLabel(item) || `Certification ${idx + 1}`}</strong>
                    </div>
                    {certificationFile(item) ? (
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() => openCertificateFile(certificationFile(item))}
                      >
                        Open
                      </button>
                    ) : (
                      <small>No file uploaded</small>
                    )}
                  </div>
                ))}
              </div>

              <div className="chat-input-row">
                <input
                  className="search-input"
                  placeholder="Write request note for student"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <button className="mini-btn" onClick={sendContactRequest} type="button">
                  Contact
                </button>
              </div>
              {requestStatus ? <div className="success-box">{requestStatus}</div> : null}
            </div>
          )}
        </div>
      </div>

      <div className="panel center-chat-panel">
        <div className="panel-heading-row">
          <h3>Accepted Chats</h3>
          {unreadCount > 0 ? <span className="heading-badge">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </div>
        <p className="inline-note">Chat opens only after student accepts your contact request.</p>
        <div className="chat-workspace">
          <div className="chat-contacts-pane">
            <h4>Accepted Contacts</h4>
            <p className="inline-note">Open a contact to start secure staff-student chat.</p>
            <div className="chat-input-row chat-action-row">
              <select
                className="search-input"
                value={selectedContact?._id || ""}
                onChange={(e) => {
                  const next = acceptedContacts.find((c) => String(c._id) === e.target.value);
                  openConversation(next || null);
                }}
              >
                <option value="">Select accepted student</option>
                {acceptedContacts.map((contact) => {
                  const unread = unreadByContact[String(contact._id)] || 0;
                  return (
                    <option key={contact._id} value={contact._id}>
                      {contact.name || contact.username}
                      {onlineUsers.includes(String(contact._id)) ? " - online" : " - offline"}
                      {unread > 0 ? ` | ${unread} new` : ""}
                    </option>
                  );
                })}
              </select>
              <button
                className="mini-btn"
                type="button"
                onClick={async () => {
                  await Promise.all([loadAcceptedContacts(), fetchUnreadSummary()]);
                }}
              >
                Refresh
              </button>
              <button className="mini-btn alt" type="button" onClick={markAllMessagesAsRead}>
                Mark All Read
              </button>
            </div>
          </div>

          <div className="chat-conversation-pane">
            <div className="chat-box">
              <AnimatePresence initial={false}>
                {chatMessages.map((m) => (
                  <motion.div
                    key={m._id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`bubble ${String(m.from) === String(user?.id) ? "me" : "other"}`}
                  >
                    {m.body}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>
            {isPeerTyping ? (
              <div className="typing-indicator" aria-label="Typing">
                <span />
                <span />
                <span />
              </div>
            ) : null}
            {chatStatus ? <div className="error-box">{chatStatus}</div> : null}
            <div className="chat-input-row">
              <input
                className="search-input"
                placeholder="Type message"
                value={chatText}
                onChange={(e) => {
                  const value = e.target.value;
                  setChatText(value);
                  if (!selectedContact?._id || !socketRef.current) return;
                  socketRef.current.emit("typing:start", { to: selectedContact._id });
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => {
                    socketRef.current?.emit("typing:stop", { to: selectedContact._id });
                  }, 700);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
              />
              <button className="mini-btn" type="button" onClick={sendChat}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffDashboard;










