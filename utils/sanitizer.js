// This file provides utilities for sanitizing HTML content to prevent XSS attacks
// It uses DOMPurify to remove potentially malicious scripts and attributes

import createDOMPurify from "dompurify"; // HTML sanitization library
import { JSDOM } from "jsdom"; // A JS implementation of the DOM for Node.js

// Initialize JSDOM window for DOMPurify to operate in
const window = new JSDOM("").window;
const DOMpPurify = createDOMPurify(window);

// Sanitizes an HTML string to remove potentially dangerous content
export const sanitizeHTML = (htmlString) => {
  return DOMpPurify.sanitize(htmlString, {
    USE_PROFILES: { html: true }, // Use the HTML profile for common tags/attributes
    FORBID_TAGS: ["script", "iframe", "object", "embed", "link"], // Explicitly forbid dangerous tags
    FORBID_ATTR: ["onerror", "onload"], // Explicitly forbid dangerous attributes
  });
};

//  Express middleware to sanitize all string values in the request body
//  Prevents XSS attacks by sanitizing user input before it's processed
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    // Iterate over all properties in the request body
    for (const key in req.body) {
      // If a property is a string, sanitize it
      if (typeof req.body[key] === "string") {
        req.body[key] = sanitizeHTML(req.body[key]);
      }
    }
  }
  next();
};
