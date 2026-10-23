import axios from "axios";

const API = axios.create({
  baseURL:"http://localhost:5000/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
export const generateAISummary = async (meetingId) => {
  const response = await API.post(`/ai/meetings/${meetingId}/summary`);
  return response.data;
};

export const transcribeMeetingChunk = async (meetingId, audioBlob, chunkIndex) => {
  const formData = new FormData();

  formData.append(
    "audio",
    audioBlob,
    `meeting-${meetingId}-audio-${chunkIndex}.webm`,
  );
  formData.append("chunkIndex", String(chunkIndex));

  const response = await API.post(
    `/ai/meetings/${meetingId}/transcript-chunk`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
};

export const finalizeMeetingAI = async (meetingId) => {
  const response = await API.post(`/ai/meetings/${meetingId}/finalize`);
  return response.data;
};

export default API;
