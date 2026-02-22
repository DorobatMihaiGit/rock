import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  journalEntries: defineTable({
    author: v.string(),
    content: v.string(),
    media: v.array(
      v.object({
        storageId: v.id("_storage"),
        type: v.union(v.literal("image"), v.literal("video")),
      })
    ),
    textPaper: v.optional(v.string()),
    stickers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          x: v.number(),
          y: v.number(),
          scale: v.number(),
        })
      )
    ),
    createdAt: v.number(),
  }).index("by_creation", ["createdAt"]),
});
