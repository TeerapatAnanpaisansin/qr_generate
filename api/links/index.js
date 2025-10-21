// qr_generate/api/links/index.js

import { z } from "zod";
import { nanoid } from "nanoid";
import { authenticate } from "../_lib/auth.js";
import { setCors, getBaseUrl } from "../_lib/http.js";
import { gristInsert, gristQuery, TABLES } from "../_lib/grist.js";
import { guardUrl } from "../_lib/url_guard.js";

const ADMIN_ROLE = "admin";
const MIN_CODE_LENGTH = 4;
const MAX_CODE_LENGTH = 32;
const DEFAULT_CODE_LENGTH = 8;

const createSchema = z.object({
  real_url: z.string().url(),
  code: z.string().min(MIN_CODE_LENGTH).max(MAX_CODE_LENGTH).optional()
});

function extractUserIdFromGristField(gristUserIdField) {
  if (gristUserIdField == null) return null;
  if (typeof gristUserIdField === "number") return gristUserIdField;
  
  if (typeof gristUserIdField === "string") {
    const referenceMatch = gristUserIdField.match(/\[(\d+)\]$/);
    if (referenceMatch) return Number(referenceMatch[1]);
    
    const directNumber = Number(gristUserIdField);
    return Number.isNaN(directNumber) ? null : directNumber;
  }
  
  if (Array.isArray(gristUserIdField)) {
    return Number(gristUserIdField[gristUserIdField.length - 1]) || null;
  }
  
  if (typeof gristUserIdField === "object" && "id" in gristUserIdField) {
    return Number(gristUserIdField.id) || null;
  }
  
  return null;
}

function isLinkVisible(linkRecord) {
  const fields = linkRecord.fields || {};
  
  if (fields.deleted === true) return false;
  if (typeof fields.clicks === "number" && fields.clicks < 0) return false;
  if (String(fields.code || "").startsWith("del_")) return false;
  
  return true;
}

function createUserLookupMap(userRecords) {
  const userMap = {};
  
  for (const userRecord of userRecords) {
    const userId = userRecord.id;
    const fields = userRecord.fields || {};
    
    userMap[userId] = {
      user_name: fields.user_name || "Unknown",
      user_email: fields.user_email || ""
    };
  }
  
  return userMap;
}

function filterLinksByOwnership(allLinks, currentUserId, isAdmin) {
  if (isAdmin) return allLinks;
  
  return allLinks.filter(linkRecord => {
    const linkOwnerId = extractUserIdFromGristField(linkRecord.fields?.user_id);
    return linkOwnerId === currentUserId;
  });
}

function buildLinkResponse(linkRecord, baseUrl, userLookupMap, isAdmin) {
  const fields = linkRecord.fields || {};
  const linkCode = fields.code || "";
  const linkOwnerId = extractUserIdFromGristField(fields.user_id);
  
  const response = {
    id: linkRecord.id,
    full_url: fields.real_url || "",
    code: linkCode,
    short_url: `${baseUrl}/u/${linkCode}`,
    clicks: Number(fields.clicks) || 0
  };

  if (isAdmin && linkOwnerId && userLookupMap[linkOwnerId]) {
    response.owner = userLookupMap[linkOwnerId];
  }

  return response;
}

async function handleCreateLink(requestBody, currentUser, baseUrl) {
  const { real_url, code } = createSchema.parse(requestBody);
  const shortCode = code || nanoid(DEFAULT_CODE_LENGTH);

  // URL Safety Guard: ป้องกันผู้ใช้สร้างลิงก์อันตราย (phishing/malware)
  const safety = await guardUrl(real_url);
  const isAdmin = currentUser.role === ADMIN_ROLE;
  if (safety.verdict === "block") {
    throw new Error("BLOCKED_UNSAFE_URL");
  }
  if (safety.verdict === "review" && !isAdmin) {
    throw new Error("REVIEW_REQUIRED");
  } 

  const existingLinks = await gristQuery(TABLES.LINKS, { code: shortCode });
  if (existingLinks.length > 0) {
    throw new Error("CODE_EXISTS");
  }

  const newLinkRecord = await gristInsert(TABLES.LINKS, {
    user_id: Number(currentUser.id),
    code: shortCode,
    real_url,
    created_date: new Date().toISOString(),
    clicks: 0
  });

  return {
    id: newLinkRecord.id,
    code: shortCode,
    real_url,
    short_url: `${baseUrl}/u/${shortCode}`
  };
}

async function handleGetLinks(currentUser, baseUrl) {
  const isAdmin = currentUser.role === ADMIN_ROLE;
  
  const allLinks = await gristQuery(TABLES.LINKS, {});
  const allUsers = isAdmin ? await gristQuery(TABLES.USERS, {}) : [];
  
  const userLookupMap = isAdmin ? createUserLookupMap(allUsers) : {};
  
  const userLinks = filterLinksByOwnership(allLinks, Number(currentUser.id), isAdmin);
  const visibleLinks = userLinks.filter(isLinkVisible);
  
  const linkResponses = visibleLinks.map(linkRecord => 
    buildLinkResponse(linkRecord, baseUrl, userLookupMap, isAdmin)
  );

  return linkResponses;
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;

  try {
    const currentUser = await authenticate(req);
    const baseUrl = getBaseUrl(req);

    if (req.method === "POST") {
      const createdLink = await handleCreateLink(req.body || {}, currentUser, baseUrl);
      return res.status(201).json(createdLink);
    }

    if (req.method === "GET") {
      const links = await handleGetLinks(currentUser, baseUrl);
      return res.json(links);
    }

    res.setHeader("Allow", "GET,POST,OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
    
  } catch (error) {

    if (error.message === "BLOCKED_UNSAFE_URL") {
      return res.status(400).json({ error: "URL is unsafe" });
    }

    if (error.message === "REVIEW_REQUIRED") {
      return res.status(400).json({ error: "Suspicious URL (needs admin review)" });
    }

    if (error.message === "No token" || error.message === "User not found") {
      return res.status(401).json({ error: "unauthorized" });
    }
    
    if (error.message === "CODE_EXISTS") {
      return res.status(409).json({ error: "code already exists" });
    }
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error("links index error:", error);
    return res.status(500).json({ error: "server error" });
  }
}