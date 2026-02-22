import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Obține toate intrările din jurnal, ordonate descrescător
export const getEntries = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db
      .query("journalEntries")
      .withIndex("by_creation")
      .order("desc")
      .collect();

    // Atașează URL-urile media la fiecare intrare
    const entriesWithMedia = await Promise.all(
      entries.map(async (entry) => {
        const mediaUrls = await Promise.all(
          entry.media.map(async (m) => ({
            url: await ctx.storage.getUrl(m.storageId),
            type: m.type,
          }))
        );
        return { ...entry, mediaUrls };
      })
    );

    return entriesWithMedia;
  },
});

// Adaugă o intrare nouă în jurnal
export const addEntry = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("journalEntries", {
      author: args.author,
      content: args.content,
      media: args.media,
      textPaper: args.textPaper,
      stickers: args.stickers,
      createdAt: Date.now(),
    });
  },
});

// Generează URL pentru upload fișier
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
