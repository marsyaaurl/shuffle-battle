import React, { useState } from "react";
import axios from "axios";
import "./App.css";
import Aurora from "./assets/Aurora";

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

const categoryMapping = {
  Sadder: "valence", // Lower valence = sadder
  Happier: "valence", // Higher valence = happier
  Energetic: "energy",
  Danceable: "danceability",
  Louder: "loudness",
  Alive: "liveness",
};

let token = null;
let tokenExpirationTime = null;

const getToken = async () => {
  if (token && tokenExpirationTime > Date.now()) {
    return token; // Gunakan token yang ada jika masih valid
  }

  try {
    const encodedCredentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${encodedCredentials}`,
        },
      }
    );

    token = response.data.access_token;
    tokenExpirationTime = Date.now() + response.data.expires_in * 1000; // expires_in dalam detik
    console.log("New token generated:", token);
    return token;
  } catch (error) {
    console.error("Error fetching token:", error);
    throw new Error("Failed to get access token");
  }
};

const getPlaylistTracks = async (playlistId) => {
  try {
    const token = await getToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Playlist Tracks Response:", response.data);
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("No tracks found in the playlist");
    }

    return response.data.items.map((item) => item.track.id).filter(Boolean);
  } catch (error) {
    console.error("Error fetching playlist:", error);
    throw new Error("Failed to fetch playlist data");
  }
};

const getAudioFeatures = async (trackIds) => {
  try {
    const token = await getToken();
    const validTrackIds = trackIds.filter(id => id && id.length === 22); // Pastikan ID track valid
    if (validTrackIds.length === 0) {
      throw new Error("No valid track IDs found");
    }

    const response = await axios.get(
      `https://api.spotify.com/v1/audio-features?ids=${validTrackIds.join(",")}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Audio Features Response:", response.data);
    if (!response.data.audio_features || response.data.audio_features.length === 0) {
      throw new Error("No audio features found");
    }

    return response.data.audio_features;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      console.error("Rate limit exceeded. Please try again later.");
    } else {
      console.error("Error fetching audio features:", error);
    }
    throw new Error("Failed to fetch audio features");
  }
};

const determineWinner = async (playlist1Id, playlist2Id, category) => {
  const featureKey = categoryMapping[category];
  if (!featureKey) return "Invalid category";

  try {
    const tracks1 = await getPlaylistTracks(playlist1Id);
    const tracks2 = await getPlaylistTracks(playlist2Id);

    if (tracks1.length === 0 || tracks2.length === 0) {
      return "One of the playlists has no tracks.";
    }

    const audioFeatures1 = await getAudioFeatures(tracks1);
    const audioFeatures2 = await getAudioFeatures(tracks2);

    if (!audioFeatures1 || !audioFeatures2) {
      throw new Error("Failed to fetch audio features");
    }

    const avgFeature1 = audioFeatures1.reduce((sum, track) => sum + (track[featureKey] || 0), 0) / audioFeatures1.length;
const avgFeature2 = audioFeatures2.reduce((sum, track) => sum + (track[featureKey] || 0), 0) / audioFeatures2.length;

    let winner;
    if (category === "Sadder") {
      winner = avgFeature1 < avgFeature2 ? "Playlist 1 is sadder" : "Playlist 2 is sadder";
    } else {
      winner = avgFeature1 > avgFeature2 ? `Playlist 1 is more ${category.toLowerCase()}` : `Playlist 2 is more ${category.toLowerCase()}`;
    }

    return winner;
  } catch (error) {
    console.error("Error in determineWinner:", error);
    throw new Error("Failed to determine winner");
  }
};

function App() {
  const [playlist1, setPlaylist1] = useState("");
  const [playlist2, setPlaylist2] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult("Calculating...");
    setIsLoading(true);
  
    if (!playlist1 || !playlist2 || !category) {
      setResult("Please fill in all fields!");
      setIsLoading(false);
      return;
    }
  
    const extractPlaylistId = (url) => {
      const match = url.match(/playlist\/([a-zA-Z0-9]{22})/); // Pastikan ID playlist valid
      if (!match) {
        console.error("Invalid playlist URL:", url);
        return null;
      }
      return match[1];
    };
  
    const playlist1Id = extractPlaylistId(playlist1);
    const playlist2Id = extractPlaylistId(playlist2);
  
    console.log("Playlist 1 ID:", playlist1Id);
    console.log("Playlist 2 ID:", playlist2Id);
  
    if (!playlist1Id || !playlist2Id) {
      setResult("Invalid playlist link!");
      setIsLoading(false);
      return;
    }
  
    try {
      const winner = await determineWinner(playlist1Id, playlist2Id, category);
      setResult(winner);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setResult("Error fetching playlist data!");
    } finally {
      setIsLoading(false);
    }
    console.log("Playlist 1 ID:", playlist1Id);
    console.log("Playlist 2 ID:", playlist2Id);
    console.log("Playlist Tracks Response:", response.data);
    console.log("Audio Features Response:", response.data);
    console.error("Error:", error);
  };

  return (
    <>
      <div className="fixed w-full h-screen flex items-start justify-center z-0">
        <Aurora colorStops={["#1DB954", "#1ED760", "#1FDF64"]} blend={0.5} amplitude={1.0} speed={0.5} className="absolute top-24" />
      </div>
      <div className="relative flex flex-col items-center justify-center h-screen gap-3 z-10">
        <h1 className="font-extrabold text-5xl text-white">Shuffle Battle</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-2">
          <input type="text" placeholder="Enter Playlist Link" value={playlist1} onChange={(e) => setPlaylist1(e.target.value)} className="bg-[#323232] rounded-md border-[#d9d9d9] w-56 h-8 p-2 text-sm font-extralight text-white" />
          <h2 className="font-extrabold text-white text-md">VS</h2>
          <input type="text" placeholder="Enter Playlist Link" value={playlist2} onChange={(e) => setPlaylist2(e.target.value)} className="bg-[#323232] rounded-md border-[#d9d9d9] w-56 h87 p-2 text-sm font-extralight text-white" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="bg-[#323232] rounded-md border-[#d9d9d9] w-56 h-8 px-2 text-sm font-medium text-white">
            <option value="">Choose Category</option>
            {Object.keys(categoryMapping).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button type="submit" className="bg-[#1DB954] rounded-md w-56 h-8 text-md font-bold text-white">Battle</button>
        </form>
        {result && <div className="text-white font-bold text-lg mt-3">{result}</div>}
      </div>
    </>
  );
}

export default App;
