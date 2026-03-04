import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, MessageCircle } from "lucide-react";
import StudentLayout from "../layouts/StudentLayout";
import StudentProfileSetup from "./StudentProfileSetup";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { connectSocket } from "../realtime/socket";

const StudentDashboard = () => {
  const { user, token, logout, updateUser } = useAuth();
  const [section, setSection] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [staffContacts, setStaffContacts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [pendingStaffRequests, setPendingStaffRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactRoleFilter, setContactRoleFilter] = useState("all");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [chatError, setChatError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [toast, setToast] = useState("");
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [unreadByContact, setUnreadByContact] = useState({});
  const socketRef = useRef(null);
  const selectedContactRef = useRef(null);
  const sectionRef = useRef(section);
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);

  const certificationLabel = (item) =>
    typeof item === "string" ? item : String(item?.title || "").trim();
  const certificationFile = (item) =>
    typeof item === "string" ? "" : String(item?.fileUrl || "").trim();

  const openCertificateFile = (fileUrl, title = "certificate") => {
    if (!fileUrl) return;
    try {
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
    } catch {
      setToast(`Unable to open ${title}.`);
      setTimeout(() => setToast(""), 2200);
    }
  };

  const refreshFriendState = async () => {
    const { data } = await api.get("/friends/state");
    setFriends(data.friends || []);
    setPendingRequests(data.pendingRequests || []);
    setOutgoingRequests(data.outgoingRequests || []);
  };

  const refreshStaffContactState = async () => {
    const [pendingRes, acceptedRes] = await Promise.all([
      api.get("/staff-contact/requests"),
      api.get("/staff-contact/accepted")
    ]);
    setPendingStaffRequests(pendingRes.data.requests || []);
    setStaffContacts(acceptedRes.data.contacts || []);
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

  const loadBase = async () => {
    const [profileRes, studentRes] = await Promise.all([
      api.get("/student/profile"),
      api.get("/student/search")
    ]);

    setProfile(profileRes.data.profile);
    setStudents(studentRes.data.students || []);
    await Promise.all([refreshFriendState(), refreshStaffContactState(), fetchUnreadSummary()]);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadBase();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (!selectedContact || section !== "messages") return;

    const run = async () => {
      try {
        const { data } = await api.get(`/messages/${selectedContact._id}`);
        setMessages(data.messages || []);
        setChatError("");
        const contactId = String(selectedContact._id);
        setUnreadByContact((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
        await fetchUnreadSummary();
      } catch (err) {
        setMessages([]);
        setChatError(err.response?.data?.message || "Unable to load conversation.");
      }
    };

    run();
  }, [selectedContact, section]);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
    setIsPeerTyping(false);
    if (selectedContact?._id) {
      const contactId = String(selectedContact._id);
      setUnreadByContact((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
    }
  }, [selectedContact]);

  useEffect(() => {
    sectionRef.current = section;
  }, [section]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, section]);

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
      const activeId = activeContact ? String(activeContact._id) : "";
      const from = String(message.from || "");
      const to = String(message.to || "");
      const inActiveConversation = activeId && (from === activeId || to === activeId);

      if (inActiveConversation) {
        setMessages((prev) =>
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

      if (sectionRef.current !== "messages") {
        setToast("New message received.");
        setTimeout(() => setToast(""), 1500);
      }
    };

    const onTypingStart = ({ from }) => {
      const activeContact = selectedContactRef.current;
      if (!activeContact) return;
      if (String(from) === String(activeContact._id)) {
        setIsPeerTyping(true);
      }
    };

    const onTypingStop = ({ from }) => {
      const activeContact = selectedContactRef.current;
      if (!activeContact) return;
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

  useEffect(() => {
    if (section === "friends" || section === "messages") {
      refreshFriendState();
      refreshStaffContactState();
      if (section === "messages") {
        fetchUnreadSummary();
      }
    }
  }, [section]);

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    const needle = search.toLowerCase();
    return students.filter((profileItem) => {
      const name = profileItem.user?.name?.toLowerCase() || "";
      const username = profileItem.user?.username?.toLowerCase() || "";
      const skills = (profileItem.skills || []).join(" ").toLowerCase();
      return name.includes(needle) || username.includes(needle) || skills.includes(needle);
    });
  }, [students, search]);

  const allContacts = useMemo(() => {
    const friendList = (friends || []).map((f) => ({ ...f, role: "student" }));
    const staffList = (staffContacts || []).map((s) => ({ ...s, role: "staff" }));
    return [...friendList, ...staffList];
  }, [friends, staffContacts]);

  const filteredContacts = useMemo(() => {
    if (contactRoleFilter === "all") return allContacts;
    return allContacts.filter((c) => c.role === contactRoleFilter);
  }, [allContacts, contactRoleFilter]);

  const unreadMessageCount = useMemo(
    () => Object.values(unreadByContact).reduce((sum, value) => sum + Number(value || 0), 0),
    [unreadByContact]
  );

  const sectionMeta = useMemo(() => {
    const map = {
      dashboard: {
        title: "Student Overview",
        subtitle: "Track your profile growth, network, and opportunities in one workspace."
      },
      skills: {
        title: "Skill Studio",
        subtitle: "Curate your strongest skills and keep your profile sharp."
      },
      friends: {
        title: "Network Explorer",
        subtitle: "Find peers by skill and build meaningful student connections."
      },
      messages: {
        title: "Message Center",
        subtitle: "Stay on top of conversations with classmates and staff contacts."
      },
      settings: {
        title: "Profile Settings",
        subtitle: "Keep your academic identity updated and professional."
      }
    };

    return map[section] || map.dashboard;
  }, [section]);

  const isAlreadyFriend = useMemo(() => {
    if (!selectedStudentProfile?.user?._id) return false;
    return friends.some((f) => String(f._id) === String(selectedStudentProfile.user._id));
  }, [friends, selectedStudentProfile]);

  const isContactRequestPending = (userId) =>
    outgoingRequests.some((req) => String(req.to?._id) === String(userId));

  const saveProfile = async (payload) => {
    setSavingProfile(true);
    try {
      const { data } = await api.put("/student/profile", payload);
      setProfile(data.profile);
      updateUser({ profileCompleted: true });
      setToast("Profile saved successfully.");
      setTimeout(() => setToast(""), 2000);
    } finally {
      setSavingProfile(false);
    }
  };

  const addSkill = async () => {
    const cleanSkill = skillInput.trim();
    if (!cleanSkill || !profile) return;
    const nextSkills = Array.from(new Set([...(profile.skills || []), cleanSkill]));

    await saveProfile({
      ...profile,
      skills: nextSkills,
      projects: profile.projects || [],
      certifications: profile.certifications || [],
      achievements: profile.achievements || [],
      links: profile.links || {}
    });
    setSkillInput("");
    setSection("skills");
  };

  const sendRequest = async (toUserId) => {
    try {
      await api.post("/friends/request", { toUserId });
      setToast("Friend request sent.");
      setTimeout(() => setToast(""), 1800);
      await refreshFriendState();
    } catch (err) {
      setToast(err.response?.data?.message || "Could not send friend request.");
      setTimeout(() => setToast(""), 2200);
    }
  };

  const respondRequest = async (requestId, action) => {
    try {
      const fromUserId =
        pendingRequests.find((r) => String(r._id) === String(requestId))?.from?._id || "";
      const { data } = await api.post("/friends/respond", { requestId, fromUserId, action });
      setToast(data.message || `Request ${action}.`);
      setTimeout(() => setToast(""), 2200);
      await refreshFriendState();
    } catch (err) {
      setToast(err.response?.data?.message || "Could not update request.");
      setTimeout(() => setToast(""), 2200);
    }
  };

  const respondStaffRequest = async (requestId, action) => {
    try {
      const { data } = await api.post("/staff-contact/respond", { requestId, action });
      setToast(data.message || `Staff request ${action}.`);
      setTimeout(() => setToast(""), 2200);
      await refreshStaffContactState();
    } catch (err) {
      setToast(err.response?.data?.message || "Could not update staff request.");
      setTimeout(() => setToast(""), 2200);
    }
  };

  const sendMessage = async () => {
    if (!selectedContact || !messageText.trim()) return;
    try {
      socketRef.current?.emit("typing:stop", { to: selectedContact._id });
      const { data } = await api.post("/messages", {
        to: selectedContact._id,
        body: messageText
      });
      setMessages((prev) => [...prev, data.message]);
      setMessageText("");
      setChatError("");
    } catch (err) {
      setChatError(err.response?.data?.message || "Unable to send message.");
    }
  };

  const markAllMessagesAsRead = async () => {
    try {
      const { data } = await api.post("/messages/read-all");
      applyUnreadSummary(data);
      setToast("All messages marked as read.");
      setTimeout(() => setToast(""), 1800);
    } catch (err) {
      setToast(err.response?.data?.message || "Unable to mark messages as read.");
      setTimeout(() => setToast(""), 2000);
    }
  };

  const onRoleFilterChange = (value) => {
    setContactRoleFilter(value);
    if (selectedContact && value !== "all" && selectedContact.role !== value) {
      setSelectedContact(null);
      setMessages([]);
    }
  };

  const runStudentSearch = async () => {
    const query = search.trim();
    const { data } = await api.get(`/student/search${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setStudents(data.students || []);
    if (selectedStudentProfile) {
      const stillExists = (data.students || []).find((p) => p._id === selectedStudentProfile._id);
      setSelectedStudentProfile(stillExists || null);
    }
  };

  const openConversation = (contact) => {
    setSelectedContact(contact || null);
    if (contact?._id) {
      const contactId = String(contact._id);
      setUnreadByContact((prev) => (prev[contactId] ? { ...prev, [contactId]: 0 } : prev));
    }
  };

  const openStudentChat = () => {
    if (!selectedStudentProfile?.user?._id) return;
    const target = allContacts.find((c) => String(c._id) === String(selectedStudentProfile.user._id));
    if (!target) {
      setToast("Chat opens after friend request is accepted.");
      setTimeout(() => setToast(""), 2200);
      return;
    }
    openConversation(target);
    setSection("messages");
  };

  const openStudentProfile = (studentProfile) => {
    setSelectedStudentProfile(studentProfile);
    setSection("friends");
  };

  if (loading) {
    return <div className="center-screen">Loading dashboard...</div>;
  }

  return (
    <StudentLayout
      activeSection={section}
      onSectionChange={setSection}
      onLogout={logout}
      navBadges={{
        messages: unreadMessageCount,
        friends: pendingRequests.length + pendingStaffRequests.length
      }}
    >
      <motion.div
        className={`dashboard-grid ${section === "messages" ? "messages-focus" : ""}`}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {toast ? <div className="toast-msg">{toast}</div> : null}

        <div className="panel dashboard-shell-head dashboard-shell-head-full">
          <div className="dashboard-head-copy">
            <span className="hero-chip">Tracker Student Hub</span>
            <h2>{sectionMeta.title}</h2>
            <p>{sectionMeta.subtitle}</p>
          </div>
          <div className="dashboard-metrics">
            <div className="metric-card">
              <small>Connections</small>
              <strong>{friends.length}</strong>
            </div>
            <div className="metric-card">
              <small>Unread Messages</small>
              <strong>{unreadMessageCount}</strong>
            </div>
            <div className="metric-card">
              <small>Profile Status</small>
              <strong>{user?.profileCompleted ? "Complete" : "Pending"}</strong>
            </div>
          </div>
        </div>

        <section className="main-column">
          {!user?.profileCompleted ? (
            <div className="alert-box">Complete your profile to unlock full student networking.</div>
          ) : null}

          {section === "dashboard" && (
            <>
              <div className="panel profile-hero-card">
                <div className="profile-cover" />
                <div className="profile-main">
                  {profile?.photoUrl ? (
                    <img className="avatar-lg profile-avatar-ring" src={profile.photoUrl} alt="profile" />
                  ) : (
                    <div className="profile-avatar-ring empty">
                      {(profile?.user?.name || profile?.user?.username || "S").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="profile-main-text">
                    <h3>{profile?.user?.name || profile?.user?.username}</h3>
                    <p>{profile?.bio || "Update your bio to make your profile stand out."}</p>
                    <small>
                      {profile?.department || "Department"} {profile?.year ? `- ${profile.year}` : ""}
                    </small>
                    <small>{friends.length}+ Connections</small>
                  </div>
                  <div className="inline-actions">
                    <button className="mini-btn" type="button" onClick={() => setSection("settings")}>
                      Edit Profile
                    </button>
                    <button className="mini-btn alt" type="button" onClick={() => setSection("messages")}>
                      Message
                    </button>
                  </div>
                </div>
              </div>

              <button
                className="panel details-toggle-btn"
                type="button"
                onClick={() => setShowStudentDetails((v) => !v)}
              >
                <span>Student Details</span>
                {showStudentDetails ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showStudentDetails ? (
                <>
                  <div className="panel">
                    <h3>About</h3>
                    <p>{profile?.bio || "No about section added yet."}</p>
                  </div>

                  <div className="panel">
                    <h3>Experience & Highlights</h3>
                    <div className="list-block">
                      <div className="list-item">
                        <div>
                          <strong>{profile?.year || "N/A"}</strong>
                          <small>Academic Year</small>
                        </div>
                      </div>
                      {(profile?.skills || []).map((item, idx) => (
                        <div className="list-item" key={`skill-${idx}`}>
                          <div>
                            <strong>{item}</strong>
                            <small>Skill</small>
                          </div>
                        </div>
                      ))}
                      {(profile?.achievements || []).map((item, idx) => (
                        <div className="list-item" key={`ach-${idx}`}>
                          <div>
                            <strong>{item}</strong>
                            <small>Achievement</small>
                          </div>
                        </div>
                      ))}
                      {(profile?.projects || []).map((item, idx) => (
                        <div className="list-item" key={`proj-${idx}`}>
                          <div>
                            <strong>{item}</strong>
                            <small>Project</small>
                          </div>
                        </div>
                      ))}
                      {(profile?.certifications || []).map((item, idx) => (
                        <div className="list-item" key={`cert-${idx}`}>
                          <div>
                            <strong>{certificationLabel(item) || `Certification ${idx + 1}`}</strong>
                            <small>Certification</small>
                          </div>
                          {certificationFile(item) ? (
                            <button
                              type="button"
                              className="mini-btn"
                              onClick={() =>
                                openCertificateFile(
                                  certificationFile(item),
                                  certificationLabel(item) || `Certification ${idx + 1}`
                                )
                              }
                            >
                              View
                            </button>
                          ) : null}
                        </div>
                      ))}
                      {(profile?.skills || []).length === 0 &&
                      (profile?.achievements || []).length === 0 &&
                      (profile?.projects || []).length === 0 &&
                      (profile?.certifications || []).length === 0 &&
                      !profile?.year ? (
                        <small>Add projects/certifications from profile setup.</small>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}

          {section === "settings" && (
            <StudentProfileSetup profile={profile} onSave={saveProfile} saving={savingProfile} />
          )}

          {section === "skills" && (
            <div className="panel">
              <h3>My Skills</h3>
              <p className="inline-note">Add and manage your skill list.</p>
              <div className="skills-wrap">
                {(profile?.skills || []).length === 0 ? (
                  <small>No skills added yet.</small>
                ) : (
                  (profile?.skills || []).map((skill) => (
                    <span key={skill} className="skill-chip">
                      {skill}
                    </span>
                  ))
                )}
              </div>
              <div className="chat-input-row">
                <input
                  className="search-input"
                  placeholder="Add new skill"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                />
                <button className="mini-btn" type="button" onClick={addSkill} disabled={savingProfile}>
                  Add Skill
                </button>
              </div>
            </div>
          )}

          {section === "friends" && (
            <div className="panel">
              <h3>Find Students By Skill</h3>
              <p className="inline-note">
                Search by skill/name, open profile, and use messaging only. Contact number is hidden.
              </p>
              <div className="chat-input-row">
                <input
                  className="search-input"
                  placeholder="Search skill or student name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="mini-btn" type="button" onClick={runStudentSearch}>
                  Search
                </button>
              </div>

              <div className="list-block">
                {filteredStudents.map((studentProfile) => (
                  <div key={studentProfile._id} className="list-item people-item">
                    <div className="mini-profile-row">
                      {studentProfile.photoUrl ? (
                        <img className="mini-avatar" src={studentProfile.photoUrl} alt="student" />
                      ) : (
                        <div className="mini-avatar empty">
                          {(studentProfile.user?.name || studentProfile.user?.username || "S")
                            .slice(0, 1)
                            .toUpperCase()}
                        </div>
                      )}
                      <strong>{studentProfile.user?.name || studentProfile.user?.username}</strong>
                    </div>
                    <button
                      className="mini-btn icon-btn"
                      type="button"
                      title="View Profile"
                      onClick={() => setSelectedStudentProfile(studentProfile)}
                    >
                      <Eye size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {selectedStudentProfile ? (
                <div className="panel">
                  <h4>{selectedStudentProfile.user?.name || selectedStudentProfile.user?.username}</h4>
                  <small>ID: @{selectedStudentProfile.user?.username || "student"}</small>
                  <p>{selectedStudentProfile.bio || "No bio available."}</p>
                  <p>
                    <strong>Department:</strong> {selectedStudentProfile.department || "N/A"}
                  </p>
                  <p>
                    <strong>Year:</strong> {selectedStudentProfile.year || "N/A"}
                  </p>
                  <p>
                    <strong>Skills:</strong> {(selectedStudentProfile.skills || []).join(", ") || "N/A"}
                  </p>
                  <p>
                    <strong>Projects:</strong> {(selectedStudentProfile.projects || []).join(", ") || "N/A"}
                  </p>
                  <p>
                    <strong>Certifications:</strong>{" "}
                    {(selectedStudentProfile.certifications || [])
                      .map((item) => certificationLabel(item))
                      .filter(Boolean)
                      .join(", ") || "N/A"}
                  </p>
                  <div className="list-block">
                    {(selectedStudentProfile.certifications || []).map((item, idx) => (
                      <div className="list-item" key={`sel-cert-${idx}`}>
                        <div>
                          <strong>{certificationLabel(item) || `Certification ${idx + 1}`}</strong>
                          <small>Certification</small>
                        </div>
                        {certificationFile(item) ? (
                          <button
                            type="button"
                            className="mini-btn"
                            onClick={() =>
                              openCertificateFile(
                                certificationFile(item),
                                certificationLabel(item) || `Certification ${idx + 1}`
                              )
                            }
                          >
                            Open
                          </button>
                        ) : (
                          <small>No file uploaded</small>
                        )}
                      </div>
                    ))}
                  </div>
                  <p>
                    <strong>Achievements:</strong> {(selectedStudentProfile.achievements || []).join(", ") || "N/A"}
                  </p>
                  <div className="list-block">
                    <div className="list-item">
                      <div>
                        <strong>{selectedStudentProfile.year || "N/A"}</strong>
                        <small>Academic Year</small>
                      </div>
                    </div>
                    {(selectedStudentProfile.skills || []).map((item, idx) => (
                      <div className="list-item" key={`det-skill-${idx}`}>
                        <div>
                          <strong>{item}</strong>
                          <small>Skill</small>
                        </div>
                      </div>
                    ))}
                    {(selectedStudentProfile.achievements || []).map((item, idx) => (
                      <div className="list-item" key={`det-ach-${idx}`}>
                        <div>
                          <strong>{item}</strong>
                          <small>Achievement</small>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="inline-actions">
                    <button
                      className="mini-btn alt"
                      type="button"
                      onClick={() => setSelectedStudentProfile(null)}
                    >
                      Back
                    </button>
                  {isAlreadyFriend ? (
                    <button className="mini-btn" type="button" onClick={openStudentChat}>
                      Message
                    </button>
                  ) : isContactRequestPending(selectedStudentProfile.user._id) ? (
                    <button className="mini-btn" type="button" disabled>
                      Request Sent
                    </button>
                  ) : (
                    <button
                      className="mini-btn"
                      type="button"
                      onClick={() => sendRequest(selectedStudentProfile.user._id)}
                    >
                      Send Contact Request
                    </button>
                  )}
                  </div>
                </div>
              ) : null}

              <div className="panel">
                <h4>Incoming Contact Requests</h4>
                <div className="list-block">
                  {pendingRequests.length === 0 ? <small>No pending requests</small> : null}
                  {pendingRequests.map((req) => (
                    <div className="list-item" key={req._id}>
                      <div>
                        <strong>{req.from?.name || req.from?.username}</strong>
                        <small>Wants to connect and chat.</small>
                      </div>
                      <div className="inline-actions">
                        <button
                          className="mini-btn"
                          type="button"
                          onClick={() => respondRequest(req._id, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          className="mini-btn alt"
                          type="button"
                          onClick={() => respondRequest(req._id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === "messages" && (
            <div className="panel center-chat-panel">
              <div className="panel-heading-row">
                <h3>Chat</h3>
                {unreadMessageCount > 0 ? (
                  <span className="heading-badge">{unreadMessageCount > 99 ? "99+" : unreadMessageCount}</span>
                ) : null}
              </div>
              <p className="inline-note">Choose a contact and start chatting.</p>
              <div className="inline-actions">
                <button
                  className="mini-btn"
                  type="button"
                  onClick={async () => {
                    await Promise.all([refreshFriendState(), refreshStaffContactState(), fetchUnreadSummary()]);
                    setToast("Requests refreshed.");
                    setTimeout(() => setToast(""), 1200);
                  }}
                >
                  Refresh Requests
                </button>
                <button className="mini-btn alt" type="button" onClick={markAllMessagesAsRead}>
                  Mark All Read
                </button>
              </div>

              <div className="panel">
                <h4>Student Contact Requests</h4>
                <div className="list-block">
                  {pendingRequests.length === 0 ? <small>No student contact requests.</small> : null}
                  {pendingRequests.map((req) => (
                    <div className="list-item" key={req._id}>
                      <div>
                        <strong>{req.from?.name || req.from?.username}</strong>
                        <small>Requested to connect for chat.</small>
                      </div>
                      <div className="inline-actions">
                        <button
                          className="mini-btn"
                          type="button"
                          onClick={() => respondRequest(req._id, "accepted")}
                        >
                          Accept
                        </button>
                        <button
                          className="mini-btn alt"
                          type="button"
                          onClick={() => respondRequest(req._id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="list-block">
                {pendingStaffRequests.length === 0 ? <small>No staff contact requests.</small> : null}
                {pendingStaffRequests.map((req) => (
                  <div className="list-item" key={req._id}>
                    <div>
                      <strong>{req.staff?.name || req.staff?.username}</strong>
                      <small>
                        {req.staff?.name || req.staff?.username} requested to chat. Accept to see messages.
                      </small>
                      {req.note ? <small>Note: {req.note}</small> : null}
                    </div>
                    <div className="inline-actions">
                      <button className="mini-btn" type="button" onClick={() => respondStaffRequest(req._id, "accepted")}>
                        Accept
                      </button>
                      <button
                        className="mini-btn alt"
                        type="button"
                        onClick={() => respondStaffRequest(req._id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="chat-workspace">
                <div className="chat-contacts-pane">
                  <h4>Contact Channel</h4>
                  <p className="inline-note">Filter by role and pick a contact to open chat.</p>

                  <select
                    className="search-input"
                    value={contactRoleFilter}
                    onChange={(e) => onRoleFilterChange(e.target.value)}
                  >
                    <option value="all">All Roles</option>
                    <option value="student">Student (My Friends)</option>
                    <option value="staff">Staff</option>
                  </select>

                  <select
                    className="search-input"
                    value={selectedContact?._id || ""}
                    onChange={(e) => {
                      const next = filteredContacts.find((c) => String(c._id) === e.target.value);
                      openConversation(next || null);
                    }}
                  >
                    <option value="">Select contact</option>
                    {filteredContacts.map((contact) => {
                      const unread = unreadByContact[String(contact._id)] || 0;
                      return (
                        <option key={contact._id} value={contact._id}>
                          {contact.name || contact.username} ({contact.role}
                          {onlineUsers.includes(String(contact._id)) ? " - online" : " - offline"})
                          {unread > 0 ? ` | ${unread} new` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="chat-conversation-pane">
                  <div className="chat-box">
                    <AnimatePresence initial={false}>
                      {messages.map((m) => (
                        <motion.div
                          key={m._id}
                          layout
                          initial={{ opacity: 0, y: 10, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.98 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`bubble ${String(m.from) === String(user.id) ? "me" : "other"}`}
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
                  {chatError ? <div className="error-box">{chatError}</div> : null}

                  <div className="chat-input-row">
                    <input
                      className="search-input"
                      placeholder="Type message"
                      value={messageText}
                      onChange={(e) => {
                        const value = e.target.value;
                        setMessageText(value);
                        if (!selectedContact || !socketRef.current) return;
                        socketRef.current.emit("typing:start", { to: selectedContact._id });
                        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() => {
                          socketRef.current?.emit("typing:stop", { to: selectedContact._id });
                        }, 700);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button className="mini-btn" type="button" onClick={sendMessage}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {section !== "messages" && (
          <aside className="right-column">
            {section === "dashboard" ? (
              <>
                <div className="panel">
                  <h3>People Also Viewed</h3>
                  <div className="list-block people-scroll">
                    {students.map((studentProfile) => (
                      <div className="list-item people-item" key={`view-${studentProfile._id}`}>
                        <div>
                          <strong>{studentProfile.user?.name || studentProfile.user?.username}</strong>
                          <small>ID: @{studentProfile.user?.username || "student"}</small>
                          <small>{(studentProfile.skills || []).slice(0, 2).join(", ") || "No skills"}</small>
                        </div>
                        <button
                          className="mini-btn icon-btn"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentProfile(studentProfile);
                          }}
                          title="View Profile"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <h3>Requests Snapshot</h3>
                  <div className="list-block">
                    <div className="list-item">
                      <div>
                        <strong>{pendingRequests.length}</strong>
                        <small>Student contact requests</small>
                      </div>
                    </div>
                    <div className="list-item">
                      <div>
                        <strong>{pendingStaffRequests.length}</strong>
                        <small>Staff contact requests</small>
                      </div>
                    </div>
                    <div className="list-item">
                      <div>
                        <strong>{friends.length}</strong>
                        <small>Connections</small>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : section !== "friends" ? (
              <div className="panel">
                <h3>Friends</h3>
                <input
                  className="search-input"
                  placeholder="Search students"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="list-block">
                  {filteredStudents.slice(0, 8).map((studentProfile) => (
                    <div className="list-item" key={studentProfile._id}>
                      <div>
                        <strong>{studentProfile.user?.name || studentProfile.user?.username}</strong>
                        <small>{(studentProfile.skills || []).slice(0, 3).join(", ") || "No skills"}</small>
                      </div>
                      {isContactRequestPending(studentProfile.user._id) ? (
                        <button className="mini-btn" type="button" disabled>
                          Sent
                        </button>
                      ) : (
                        <button
                          className="mini-btn"
                          onClick={() => sendRequest(studentProfile.user._id)}
                          type="button"
                        >
                          Contact
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="panel">
              <h3>Incoming Contact Requests</h3>
              <div className="list-block">
                {pendingRequests.length === 0 ? <small>No pending requests</small> : null}
                {pendingRequests.map((req) => (
                  <div className="list-item" key={req._id}>
                    <div>
                      <strong>{req.from?.name || req.from?.username}</strong>
                    </div>
                    <div className="inline-actions">
                      <button
                        className="mini-btn"
                        type="button"
                        onClick={() => respondRequest(req._id, "accepted")}
                      >
                        Accept
                      </button>
                      <button
                        className="mini-btn alt"
                        type="button"
                        onClick={() => respondRequest(req._id, "rejected")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel">
              <h3>Sent Contact Requests</h3>
              <div className="list-block">
                {outgoingRequests.length === 0 ? <small>No sent requests</small> : null}
                {outgoingRequests.map((req) => (
                  <div className="list-item" key={req._id}>
                    <div>
                      <strong>{req.to?.name || req.to?.username}</strong>
                      <small>Status: pending</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        )}
      </motion.div>
    </StudentLayout>
  );
};

export default StudentDashboard;







