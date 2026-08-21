import api from "./axios";

const chapterBase = "/ffa-chapters";
const adminChapterBase = "/admin/ffa-chapters";

function pathSegment(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new TypeError(`${label} is required.`);
  return encodeURIComponent(normalized);
}

export function getFfaApiError(error, fallback = "BarnBuddy could not complete that chapter request.") {
  const candidate = error?.response?.data?.error || error?.response?.data?.message;
  if (typeof candidate !== "string") return fallback;

  const safeMessage = candidate.trim().replace(/\s+/g, " ");
  return safeMessage && safeMessage.length <= 240 ? safeMessage : fallback;
}

export const getMyFfaChapter = () => api.get(`${chapterBase}/me`);

export const joinFfaChapter = (code) =>
  api.post(`${chapterBase}/join`, { code: String(code || "").trim() });

export const getAdvisorFfaChapter = () => api.get(`${chapterBase}/advisor`);

export const regenerateAdvisorJoinCode = () =>
  api.post(`${chapterBase}/advisor/join-code/regenerate`);

export const updateAdvisorJoining = (joinEnabled) =>
  api.patch(`${chapterBase}/advisor/joining`, { joinEnabled: joinEnabled === true });

export const updateAdvisorProjectSharing = (enabled) =>
  api.patch(`${chapterBase}/advisor/project-sharing`, { enabled: enabled === true });

export const getAdvisorSharedProjects = () =>
  api.get(`${chapterBase}/advisor/shared-projects`);

export const getAdvisorSharedProject = (shareId) =>
  api.get(`${chapterBase}/advisor/shared-projects/${pathSegment(shareId, "Share ID")}`);

export const removeAdvisorMember = (userId) =>
  api.delete(`${chapterBase}/advisor/members/${pathSegment(userId, "Member ID")}`);

export const getAdminFfaChapters = () => api.get(adminChapterBase);

export const createAdminFfaChapter = (data) => api.post(adminChapterBase, data);

export const getAdminFfaChapter = (chapterId) =>
  api.get(`${adminChapterBase}/${pathSegment(chapterId, "Chapter ID")}`);

export const updateAdminFfaChapter = (chapterId, data) =>
  api.patch(`${adminChapterBase}/${pathSegment(chapterId, "Chapter ID")}`, data);

export const deleteAdminFfaChapter = (chapterId) =>
  api.delete(`${adminChapterBase}/${pathSegment(chapterId, "Chapter ID")}`);

export const regenerateAdminJoinCode = (chapterId) =>
  api.post(`${adminChapterBase}/${pathSegment(chapterId, "Chapter ID")}/join-code/regenerate`);

export const getAdminFfaChapterMembers = (chapterId) =>
  api.get(`${adminChapterBase}/${pathSegment(chapterId, "Chapter ID")}/members`);

export const removeAdminFfaChapterMember = (chapterId, userId) =>
  api.delete(
    `${adminChapterBase}/${pathSegment(chapterId, "Chapter ID")}/members/${pathSegment(userId, "Member ID")}`
  );
