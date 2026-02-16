import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import type { ServerDependencies } from "../server.js";
import {
  ProjectListSchema,
  ProjectGetSchema,
  ProjectCreateSchema,
  ProjectUpdateSchema,
  ProjectDeleteSchema,
} from "../schemas/project.js";
import { ok, notFound, forbidden, fromCatch } from "../utils/errors.js";
import { verifyProjectOwnership } from "../utils/ownership.js";

export function registerProjectTools(
  server: McpServer,
  { prisma, authContext }: ServerDependencies,
): void {
  const userId = authContext.userId;

  // ── project_list ──────────────────────────────────────────
  server.tool(
    "project_list",
    "List all projects for the authenticated user",
    ProjectListSchema.shape,
    async () => {
      try {
        const projects = await prisma.project.findMany({
          where: { userId },
          include: {
            _count: { select: { scenes: true, characters: true } },
          },
          orderBy: { updatedAt: "desc" },
        });
        return ok(projects);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── project_get ───────────────────────────────────────────
  server.tool(
    "project_get",
    "Get a project with scene/character counts and identity",
    ProjectGetSchema.shape,
    async ({ projectId }) => {
      try {
        const project = await prisma.project.findFirst({
          where: { id: projectId, userId },
          include: {
            identity: true,
            _count: { select: { scenes: true, characters: true } },
          },
        });
        if (!project) return notFound("Project", projectId);
        return ok(project);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── project_create ────────────────────────────────────────
  server.tool(
    "project_create",
    "Create a new project with optional identity and characters",
    ProjectCreateSchema.shape,
    async ({ name, description, genre, identity, characters }) => {
      try {
        const project = await prisma.project.create({
          data: {
            name,
            description: description ?? null,
            genre: genre ?? null,
            user: { connect: { id: userId } },
            ...(identity
              ? {
                  identity: {
                    create: {
                      data: identity as Prisma.InputJsonValue,
                    },
                  },
                }
              : {}),
            ...(characters && characters.length > 0
              ? {
                  characters: {
                    create: characters.map((c) => ({
                      name: c.name,
                      role: c.role,
                      coreIdentity: c.coreIdentity ?? null,
                    })),
                  },
                }
              : {}),
          },
          include: {
            identity: true,
            characters: true,
            _count: { select: { scenes: true, characters: true } },
          },
        });
        return ok(project);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── project_update ────────────────────────────────────────
  server.tool(
    "project_update",
    "Update project fields (name, description, genre, status, coverImage)",
    ProjectUpdateSchema.shape,
    async ({ projectId, ...fields }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        const data: Record<string, unknown> = {};
        if (fields.name !== undefined) data.name = fields.name;
        if (fields.description !== undefined)
          data.description = fields.description;
        if (fields.genre !== undefined) data.genre = fields.genre;
        if (fields.status !== undefined) data.status = fields.status;
        if (fields.coverImage !== undefined)
          data.coverImage = fields.coverImage;

        const updated = await prisma.project.update({
          where: { id: projectId },
          data,
          include: {
            _count: { select: { scenes: true, characters: true } },
          },
        });
        return ok(updated);
      } catch (e) {
        return fromCatch(e);
      }
    },
  );

  // ── project_delete ────────────────────────────────────────
  server.tool(
    "project_delete",
    "Delete a project and all its data (cascade)",
    ProjectDeleteSchema.shape,
    async ({ projectId }) => {
      try {
        const owned = await verifyProjectOwnership(prisma, projectId, userId);
        if (!owned) return forbidden();

        await prisma.project.delete({ where: { id: projectId } });
        return ok({ deleted: true, projectId });
      } catch (e) {
        return fromCatch(e);
      }
    },
  );
}
