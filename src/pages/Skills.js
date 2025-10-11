import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import aliasMap from "../data/alias-map.json";
import api from "../api";
import { addUserSkill, getMatches, startConversationFromMatch } from "../auth";
import SkillSelector from "../components/SkillSelector";
import ActiveUsers from "../components/ActiveUsers";
import useVideoCall from "../hooks/useVideoCall";
import VideoCall from "../components/VideoCall";
import IncomingCall from "../components/IncomingCall";

export default function Skills() {
  const navigate = useNavigate();
  
  const [allSkills, setAllSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [skillsError, setSkillsError] = useState(null);

  const [categoryFilterLearn, setCategoryFilterLearn] = useState("");
  const [subcategoryFilterLearn, setSubcategoryFilterLearn] = useState("");
  const [tempSelectedLearn, setTempSelectedLearn] = useState([]);
  const [skillsToLearn, setSkillsToLearn] = useState([]);
  const [searchLearn, setSearchLearn] = useState("");

  const [categoryFilterTeach, setCategoryFilterTeach] = useState("");
  const [subcategoryFilterTeach, setSubcategoryFilterTeach] = useState("");
  const [tempSelectedTeach, setTempSelectedTeach] = useState([]);
  const [skillsToTeach, setSkillsToTeach] = useState([]);
  const [searchTeach, setSearchTeach] = useState("");

  const [userSkills, setUserSkills] = useState([]);
  const [matches, setMatches] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  const {
    currentCall,
    isVideoCallOpen,
    incomingCall,
    initiateCall,
    acceptIncomingCall,
    declineIncomingCall,
    endCall
  } = useVideoCall();

  const normalize = (str = "") =>
    str
      .toString()
      .toLowerCase()
      .replace(/[-_.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const normalizedAliasMap = {};
  for (const key in aliasMap) {
    normalizedAliasMap[normalize(key)] = aliasMap[key].map(normalize);
  }
  const getAliasesForToken = (token) =>
    normalizedAliasMap[token] ? [token, ...normalizedAliasMap[token]] : [token];

  const getUserIdFromToken = () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return null;
      const payload = token.split(".")[1];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(window.atob(base64));
      return json.user_id || json.user || json.userId || null;
    } catch {
      return null;
    }
  };

  const getSearchResults = (searchText) => {
    const normalizedSearch = normalize(searchText);
    if (!normalizedSearch) return [];
    const tokens = normalizedSearch.split(" ");
    const expanded = tokens.flatMap(getAliasesForToken);
    return allSkills
      .filter((s) => {
        const cat = normalize(s.category || "");
        const sub = normalize(s.subcategory || "");
        const name = normalize(s.name || "");
        return expanded.some((t) => cat.includes(t) || sub.includes(t) || name.includes(t));
      })
      .slice(0, 40);
  };

  const getSkillByName = (name) =>
    allSkills.find((s) => s.name === name || normalize(s.name) === normalize(name));

  useEffect(() => {
    const load = async () => {
      setLoadingSkills(true);
      try {
        const res = await api.get("skills/");
        setAllSkills(res.data || []);
      } catch (err) {
        setSkillsError(err?.message || "Failed to load skills");
      } finally {
        setLoadingSkills(false);
      }
    };
    load();
    setCurrentUserId(getUserIdFromToken());
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const fetchUserData = async () => {
      try {
        const res = await api.get("user-skills/");
        const rows = res.data || [];

        const mapped = rows.map((r) => {
          let skillId = null;
          let skillName = "";
          if (r.skill && typeof r.skill === "object") {
            skillId = r.skill.id;
            skillName = r.skill.name;
          } else {
            skillId = r.skill;
            const s = (allSkills || []).find((x) => x.id === skillId);
            skillName = s ? s.name : String(skillId);
          }
          return { id: r.id, skillId, skillName, type: r.type };
        });

        setUserSkills(mapped);
        setSkillsToLearn(
          mapped.filter((m) => m.type === "learn").map((m) => m.skillName)
        );
        setSkillsToTeach(
          mapped.filter((m) => m.type === "teach").map((m) => m.skillName)
        );

        const matchesData = await getMatches();
        setMatches(matchesData || []);
      } catch (err) {
        console.warn("Could not fetch user data:", err?.response?.data || err.message);
      }
    };

    fetchUserData();
  }, [allSkills]);

  const subcategoriesLearn = categoryFilterLearn
    ? [
        ...new Set(
          allSkills
            .filter((s) => s.category === categoryFilterLearn)
            .map((s) => s.subcategory)
            .filter(Boolean)
        ),
      ].sort()
    : [];

  const subcategoriesTeach = categoryFilterTeach
    ? [
        ...new Set(
          allSkills
            .filter((s) => s.category === categoryFilterTeach)
            .map((s) => s.subcategory)
            .filter(Boolean)
        ),
      ].sort()
    : [];

  const addSelectedLearn = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return alert("Please log in to save skills.");

    for (const skillName of tempSelectedLearn) {
      const skillObj = getSkillByName(skillName);
      if (!skillObj) continue;
      try {
        const created = await addUserSkill(skillObj.id, "learn");
        const createdSkillId = created?.skill?.id ?? created?.skill ?? skillObj.id;
        const createdObj = {
          id: created?.id ?? null,
          skillId: createdSkillId,
          skillName: skillObj.name,
          type: "learn",
        };
        setUserSkills((prev) => {
          if (prev.some((u) => u.skillId === createdObj.skillId && u.type === "learn"))
            return prev;
          return [...prev, createdObj];
        });
        setSkillsToLearn((prev) =>
          !prev.includes(skillObj.name) ? [...prev, skillObj.name] : prev
        );
      } catch (err) {
        console.error("Add learn failed:", err?.response?.data || err.message);
      }
    }
    setTempSelectedLearn([]);
    try {
      const m = await getMatches();
      setMatches(m || []);
    } catch {}
  };

  const addSelectedTeach = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return alert("Please log in to save skills.");

    for (const skillName of tempSelectedTeach) {
      const skillObj = getSkillByName(skillName);
      if (!skillObj) continue;
      try {
        const created = await addUserSkill(skillObj.id, "teach");
        const createdSkillId = created?.skill?.id ?? created?.skill ?? skillObj.id;
        const createdObj = {
          id: created?.id ?? null,
          skillId: createdSkillId,
          skillName: skillObj.name,
          type: "teach",
        };
        setUserSkills((prev) => {
          if (prev.some((u) => u.skillId === createdObj.skillId && u.type === "teach"))
            return prev;
          return [...prev, createdObj];
        });
        setSkillsToTeach((prev) =>
          !prev.includes(skillObj.name) ? [...prev, skillObj.name] : prev
        );
      } catch (err) {
        console.error("Add teach failed:", err?.response?.data || err.message);
      }
    }
    setTempSelectedTeach([]);
    try {
      const m = await getMatches();
      setMatches(m || []);
    } catch {}
  };

  const addSkillFromSearchLearn = async (skillName) => {
    setSearchLearn("");
    const skillObj = getSkillByName(skillName);
    if (!skillObj) return;
    await addSelectedLearnInternal(skillObj);
  };

  const addSkillFromSearchTeach = async (skillName) => {
    setSearchTeach("");
    const skillObj = getSkillByName(skillName);
    if (!skillObj) return;
    await addSelectedTeachInternal(skillObj);
  };

  const addSelectedLearnInternal = async (skillObj) => {
    const token = localStorage.getItem("access_token");
    if (!token) return alert("Please log in to save skills.");
    try {
      const created = await addUserSkill(skillObj.id, "learn");
      const createdSkillId = created?.skill?.id ?? created?.skill ?? skillObj.id;
      const createdObj = {
        id: created?.id ?? null,
        skillId: createdSkillId,
        skillName: skillObj.name,
        type: "learn",
      };
      setUserSkills((prev) => {
        if (prev.some((u) => u.skillId === createdObj.skillId && u.type === "learn"))
          return prev;
        return [...prev, createdObj];
      });
      setSkillsToLearn((prev) =>
        !prev.includes(skillObj.name) ? [...prev, skillObj.name] : prev
      );
      const m = await getMatches();
      setMatches(m || []);
    } catch (err) {
      console.error(err);
    }
  };

  const addSelectedTeachInternal = async (skillObj) => {
    const token = localStorage.getItem("access_token");
    if (!token) return alert("Please log in to save skills.");
    try {
      const created = await addUserSkill(skillObj.id, "teach");
      const createdSkillId = created?.skill?.id ?? created?.skill ?? skillObj.id;
      const createdObj = {
        id: created?.id ?? null,
        skillId: createdSkillId,
        skillName: skillObj.name,
        type: "teach",
      };
      setUserSkills((prev) => {
        if (prev.some((u) => u.skillId === createdObj.skillId && u.type === "teach"))
          return prev;
        return [...prev, createdObj];
      });
      setSkillsToTeach((prev) =>
        !prev.includes(skillObj.name) ? [...prev, skillObj.name] : prev
      );
      const m = await getMatches();
      setMatches(m || []);
    } catch (err) {
      console.error(err);
    }
  };

  const removeSkillLearn = async (skillName) => {
    const skillObj = getSkillByName(skillName);
    if (!skillObj) {
      setSkillsToLearn((prev) => prev.filter((s) => s !== skillName));
      return;
    }
    const us = userSkills.find((u) => u.skillId === skillObj.id && u.type === "learn");
    if (!us) {
      setSkillsToLearn((prev) => prev.filter((s) => s !== skillName));
      return;
    }
    try {
      await api.delete(`user-skills/${us.id}/`);
      setUserSkills((prev) => prev.filter((x) => x.id !== us.id));
      setSkillsToLearn((prev) => prev.filter((s) => s !== skillName));
      const m = await getMatches();
      setMatches(m || []);
    } catch (err) {
      console.error("Failed to delete user-skill:", err?.response?.data || err.message);
      setSkillsToLearn((prev) => prev.filter((s) => s !== skillName));
    }
  };

  const removeSkillTeach = async (skillName) => {
    const skillObj = getSkillByName(skillName);
    if (!skillObj) {
      setSkillsToTeach((prev) => prev.filter((s) => s !== skillName));
      return;
    }
    const us = userSkills.find((u) => u.skillId === skillObj.id && u.type === "teach");
    if (!us) {
      setSkillsToTeach((prev) => prev.filter((s) => s !== skillName));
      return;
    }
    try {
      await api.delete(`user-skills/${us.id}/`);
      setUserSkills((prev) => prev.filter((x) => x.id !== us.id));
      setSkillsToTeach((prev) => prev.filter((s) => s !== skillName));
      const m = await getMatches();
      setMatches(m || []);
    } catch (err) {
      console.error("Failed to delete user-skill:", err?.response?.data || err.message);
      setSkillsToTeach((prev) => prev.filter((s) => s !== skillName));
    }
  };

  const handleFindMatches = async () => {
    if (skillsToLearn.length === 0 || skillsToTeach.length === 0) {
      alert("Please add at least one skill to learn and teach!");
      return;
    }
    try {
      const data = await getMatches();
      setMatches(data || []);
    } catch (err) {
      console.error("Failed to fetch matches:", err);
      alert("Error fetching matches. Make sure you're logged in and try again.");
    }
  };

  const handleStartConversation = async (matchId) => {
    console.log('Starting conversation for match:', matchId);
    try {
      const result = await startConversationFromMatch(matchId);
      console.log('Conversation result:', result);
      
      if (result && result.conversation && result.conversation.id) {
        console.log('Navigating to conversation ID:', result.conversation.id);
        navigate(`/messages/${result.conversation.id}`);
      } else {
        console.error('Invalid conversation data:', result);
        alert("Failed to start conversation. Invalid response from server.");
      }
    } catch (err) {
      console.error("Failed to start conversation:", err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      alert(`Failed to start conversation: ${errorMsg}. Please try again.`);
    }
  };

  const handleVideoCall = (user) => {
    initiateCall(user);
  };

  const renderMatchCard = (match) => {
    const learner = match.learner;
    const teacher = match.teacher;
    const skill = match.skill;
    const teacherSkill = match.teacher_skill;
    const isMutual = !!match.is_mutual;
    const tier = match.match_tier;

    const userId = Number(currentUserId);
    
    // Determine if current user is the learner or teacher in this match
    const isCurrentUserLearner = userId && learner && Number(learner.id) === userId;
    const isCurrentUserTeacher = userId && teacher && Number(teacher.id) === userId;
    
    // Determine the other person in the match
    let partner = null;
    let partnerRole = "";
    
    if (isCurrentUserLearner) {
      partner = teacher;
      partnerRole = "Teacher";
    } else if (isCurrentUserTeacher) {
      partner = learner;
      partnerRole = "Learner";
    } else {
      // Fallback
      partner = teacher;
      partnerRole = "Teacher";
    }

    // Determine what skill to display based on user's role
    let displayText = "";
    if (isCurrentUserLearner) {
      // Current user wants to learn this skill
      displayText = `You want to learn: ${skill?.name ?? "Unknown skill"}`;
      if (teacherSkill && teacherSkill.id !== skill.id) {
        displayText += ` (They can teach: ${teacherSkill.name})`;
      }
    } else if (isCurrentUserTeacher) {
      // Current user is teaching, so the skill is what the learner wants to learn
      displayText = `You can teach: ${teacherSkill?.name ?? skill?.name ?? "Unknown skill"}`;
      displayText += ` (They want to learn: ${skill?.name ?? "Unknown skill"})`;
    } else {
      // Fallback
      displayText = `Skill: ${skill?.name ?? "Unknown skill"}`;
    }

    const tierInfo = {
      exact: { icon: '⭐', color: 'border-yellow-500', bgColor: 'bg-yellow-500', label: 'Exact Match' },
      subcategory: { icon: '🎯', color: 'border-blue-500', bgColor: 'bg-blue-500', label: 'Subcategory' },
      category: { icon: '📂', color: 'border-purple-500', bgColor: 'bg-purple-500', label: 'Category' }
    };

    return (
      <li
        key={match.id}
        className={`bg-purple-800 bg-opacity-70 rounded-xl p-4 shadow-md hover:bg-purple-700 transition border-l-4 ${tierInfo[tier]?.color || 'border-purple-500'}`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{tierInfo[tier]?.icon || '⭐'}</span>
              <p className="font-semibold">
                <strong>{partner?.username ?? "Unknown"}</strong> — {partnerRole}
              </p>
            </div>
            <p className="text-sm mb-1">{displayText}</p>
            
            {teacherSkill && skill && tier === 'subcategory' && (
              <p className="text-xs text-purple-300">
                Both in subcategory: <span className="italic">{skill.subcategory}</span>
              </p>
            )}
            {teacherSkill && skill && tier === 'category' && (
              <p className="text-xs text-purple-300">
                Both in category: <span className="italic">{skill.category}</span>
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-xs ${tierInfo[tier]?.bgColor} bg-opacity-30 border ${tierInfo[tier]?.color} px-2 py-1 rounded`}>
                {tierInfo[tier]?.icon} {tierInfo[tier]?.label}
              </span>
              {isMutual && (
                <span className="text-xs bg-green-600 bg-opacity-40 border border-green-400 px-2 py-1 rounded">
                  Mutual ⭐
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => handleStartConversation(match.id)}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition ml-4"
          >
            Message
          </button>
        </div>
      </li>
    );
  };

  const searchResultsLearn = getSearchResults(searchLearn);
  const searchResultsTeach = getSearchResults(searchTeach);

  // Group matches by tier for display
  const matchesByTier = {
    exact: matches.filter(m => m.match_tier === 'exact'),
    subcategory: matches.filter(m => m.match_tier === 'subcategory'),
    category: matches.filter(m => m.match_tier === 'category')
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-700 text-white flex flex-col items-center p-8">
      <header className="mb-12 text-center max-w-3xl">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">SkillSwap</h1>
        <p className="text-lg font-light drop-shadow-md">
          Connect, teach, and learn new skills by matching with people like you.
        </p>
      </header>

      <main className="w-full max-w-xl bg-white bg-opacity-10 rounded-3xl p-8 shadow-xl backdrop-blur-md overflow-auto">
        {loadingSkills ? (
          <p className="text-center text-purple-200">Loading skills...</p>
        ) : skillsError ? (
          <p className="text-center text-red-300">Error loading skills: {skillsError}</p>
        ) : (
          <>
            <SkillSelector
              title="Skills You Want to Learn"
              skills={allSkills}
              category={categoryFilterLearn}
              subcategory={subcategoryFilterLearn}
              onCategoryChange={(v) => {
                setCategoryFilterLearn(v);
                setSubcategoryFilterLearn("");
                setTempSelectedLearn([]);
              }}
              onSubcategoryChange={(v) => {
                setSubcategoryFilterLearn(v);
                setTempSelectedLearn([]);
              }}
              subcategories={subcategoriesLearn}
              tempSelected={tempSelectedLearn}
              setTempSelected={setTempSelectedLearn}
              addSelected={addSelectedLearn}
              searchValue={searchLearn}
              setSearchValue={setSearchLearn}
              searchResults={searchResultsLearn}
              addFromSearch={addSkillFromSearchLearn}
              selectedSkills={skillsToLearn}
              removeSelectedSkill={removeSkillLearn}
            />

            <SkillSelector
              title="Skills You Can Teach"
              skills={allSkills}
              category={categoryFilterTeach}
              subcategory={subcategoryFilterTeach}
              onCategoryChange={(v) => {
                setCategoryFilterTeach(v);
                setSubcategoryFilterTeach("");
                setTempSelectedTeach([]);
              }}
              onSubcategoryChange={(v) => {
                setSubcategoryFilterTeach(v);
                setTempSelectedTeach([]);
              }}
              subcategories={subcategoriesTeach}
              tempSelected={tempSelectedTeach}
              setTempSelected={setTempSelectedTeach}
              addSelected={addSelectedTeach}
              searchValue={searchTeach}
              setSearchValue={setSearchTeach}
              searchResults={searchResultsTeach}
              addFromSearch={addSkillFromSearchTeach}
              selectedSkills={skillsToTeach}
              removeSelectedSkill={removeSkillTeach}
            />

            <button
              onClick={handleFindMatches}
              className="w-full py-3 bg-purple-600 rounded-full font-semibold hover:bg-purple-700 transition mt-6"
            >
              Find Matches
            </button>

            <section className="mt-8">
              {matches && matches.length > 0 ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">Your Matches</h2>
                  
                  {/* Exact Matches */}
                  {matchesByTier.exact.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <span>⭐</span>
                        <span>Exact Matches</span>
                        <span className="text-sm text-purple-300">({matchesByTier.exact.length})</span>
                      </h3>
                      <ul className="space-y-3">
                        {matchesByTier.exact.map((m) => renderMatchCard(m))}
                      </ul>
                    </div>
                  )}

                  {/* Subcategory Matches */}
                  {matchesByTier.subcategory.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <span>🎯</span>
                        <span>Subcategory Matches</span>
                        <span className="text-sm text-purple-300">({matchesByTier.subcategory.length})</span>
                      </h3>
                      <ul className="space-y-3">
                        {matchesByTier.subcategory.map((m) => renderMatchCard(m))}
                      </ul>
                    </div>
                  )}

                  {/* Category Matches */}
                  {matchesByTier.category.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                        <span>📂</span>
                        <span>Category Matches</span>
                        <span className="text-sm text-purple-300">({matchesByTier.category.length})</span>
                      </h3>
                      <ul className="space-y-3">
                        {matchesByTier.category.map((m) => renderMatchCard(m))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="italic text-purple-300 mt-6">
                  No matches yet — add skills and click "Find Matches".
                </p>
              )}
            </section>
            <section className="mt-8">
              <ActiveUsers onVideoCall={handleVideoCall} />
            </section>
          </>
        )}
      </main>

      <footer className="mt-auto text-purple-300 text-sm mt-12 mb-6">
        © 2025 SkillSwap — Made with 💜
      </footer>

      {incomingCall && (
        <IncomingCall 
          callData={incomingCall}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

      {isVideoCallOpen && currentCall && (
        <VideoCall
          isOpen={isVideoCallOpen}
          onClose={endCall}
          callId={currentCall.id}
          isInitiator={currentCall.isInitiator}
          remoteUserId={currentCall.remoteUserId}
          remoteUsername={currentCall.remoteUsername}
        />
      )}
    </div>
  );
}