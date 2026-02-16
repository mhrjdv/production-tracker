"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createCharacter,
  updateCharacter,
  deleteCharacter,
} from "@/lib/actions";
import { DeleteDialog } from "@/components/delete-dialog";

interface CharacterItem {
  id: string;
  name: string;
  role: string;
  coreIdentity: string | null;
  designPhilosophy: string | null;
  visualCues: string[];
  bodyLanguage: string[];
  portraitUrl: string | null;
}

function CharacterCard({
  char,
  projectId,
  onDelete,
}: {
  char: CharacterItem;
  projectId: string;
  onDelete: (c: CharacterItem) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [name, setName] = useState(char.name);
  const [role, setRole] = useState(char.role);
  const [coreIdentity, setCoreIdentity] = useState(char.coreIdentity ?? "");
  const [designPhilosophy, setDesignPhilosophy] = useState(
    char.designPhilosophy ?? "",
  );
  const [portraitUrl, setPortraitUrl] = useState(char.portraitUrl ?? "");
  const [visualCues, setVisualCues] = useState<string[]>(char.visualCues);
  const [bodyLanguage, setBodyLanguage] = useState<string[]>(char.bodyLanguage);
  const [cueInput, setCueInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const cancel = () => {
    setName(char.name);
    setRole(char.role);
    setCoreIdentity(char.coreIdentity ?? "");
    setDesignPhilosophy(char.designPhilosophy ?? "");
    setPortraitUrl(char.portraitUrl ?? "");
    setVisualCues(char.visualCues);
    setBodyLanguage(char.bodyLanguage);
    setCueInput("");
    setLangInput("");
    setEditing(false);
  };

  const save = () => {
    if (!name.trim() || !role.trim()) return;
    startTransition(async () => {
      await updateCharacter(char.id, {
        name: name.trim(),
        role: role.trim(),
        coreIdentity: coreIdentity.trim() || null,
        designPhilosophy: designPhilosophy.trim() || null,
        visualCues,
        bodyLanguage,
        portraitUrl: portraitUrl || null,
      });
      setEditing(false);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.url) setPortraitUrl(json.url);
    } finally {
      setUploading(false);
    }
  };

  const addTag = (
    list: string[],
    setList: (v: string[]) => void,
    val: string,
    setInput: (v: string) => void,
  ) => {
    const trimmed = val.trim();
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
    setInput("");
  };

  if (editing) {
    return (
      <Card className="border-primary/30 shadow-md transition-all">
        <CardHeader>
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : portraitUrl ? (
                <Image
                  src={portraitUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="h-full w-full object-cover"
                  sizes="56px"
                  quality={70}
                />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <div className="flex-1 space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Character name"
                className="font-semibold"
              />
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Role"
                className="text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Core Identity
            </p>
            <Textarea
              value={coreIdentity}
              onChange={(e) => setCoreIdentity(e.target.value)}
              rows={2}
              placeholder="Character's core identity..."
              className="text-sm"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Design Philosophy
            </p>
            <Textarea
              value={designPhilosophy}
              onChange={(e) => setDesignPhilosophy(e.target.value)}
              rows={2}
              placeholder="Visual design approach..."
              className="text-sm"
            />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Visual Cues
            </p>
            <div className="flex gap-2 mb-1">
              <Input
                value={cueInput}
                onChange={(e) => setCueInput(e.target.value)}
                placeholder="Add cue..."
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(visualCues, setVisualCues, cueInput, setCueInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() =>
                  addTag(visualCues, setVisualCues, cueInput, setCueInput)
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {visualCues.map((cue, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs"
                >
                  {cue.length > 25 ? cue.slice(0, 25) + "…" : cue}
                  <button
                    onClick={() =>
                      setVisualCues(visualCues.filter((_, j) => j !== i))
                    }
                    className="hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Body Language
            </p>
            <div className="flex gap-2 mb-1">
              <Input
                value={langInput}
                onChange={(e) => setLangInput(e.target.value)}
                placeholder="Add note..."
                className="text-xs h-8"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(
                      bodyLanguage,
                      setBodyLanguage,
                      langInput,
                      setLangInput,
                    );
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() =>
                  addTag(bodyLanguage, setBodyLanguage, langInput, setLangInput)
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {bodyLanguage.map((lang, i) => (
                <Badge key={i} variant="outline" className="gap-1 pr-1 text-xs">
                  {lang}
                  <button
                    onClick={() =>
                      setBodyLanguage(bodyLanguage.filter((_, j) => j !== i))
                    }
                    className="hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
          {/* Save / Cancel */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={cancel}
              disabled={isPending}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={isPending || !name.trim() || !role.trim()}
              className="gap-1"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // View mode
  return (
    <Card className="group hover:border-primary/30 hover:shadow-md transition-all relative">
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(char)}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CardHeader>
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 overflow-hidden">
            {char.portraitUrl ? (
              <Image
                src={char.portraitUrl}
                alt={char.name}
                width={56}
                height={56}
                className="h-14 w-14 rounded-xl object-cover"
                sizes="56px"
                quality={70}
              />
            ) : (
              <span className="text-xl font-bold text-primary">
                {char.name[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg line-clamp-1">{char.name}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="mt-1">
                {char.role}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {char.coreIdentity && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Core Identity
            </p>
            <p className="text-sm line-clamp-3">{char.coreIdentity}</p>
          </div>
        )}
        {char.designPhilosophy && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Design Philosophy
            </p>
            <p className="text-sm line-clamp-2">{char.designPhilosophy}</p>
          </div>
        )}
        {char.visualCues.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Visual Cues
            </p>
            <div className="flex flex-wrap gap-1">
              {char.visualCues.slice(0, 4).map((cue, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs font-normal"
                >
                  {cue.length > 30 ? cue.slice(0, 30) + "…" : cue}
                </Badge>
              ))}
              {char.visualCues.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{char.visualCues.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
        {char.bodyLanguage.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              Body Language
            </p>
            <div className="flex flex-wrap gap-1">
              {char.bodyLanguage.slice(0, 4).map((lang, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {lang.length > 30 ? lang.slice(0, 30) + "…" : lang}
                </Badge>
              ))}
              {char.bodyLanguage.length > 4 && (
                <Badge variant="secondary" className="text-xs">
                  +{char.bodyLanguage.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Add Character Card ──────────────────────────────────────

function AddCharacterCard({ projectId }: { projectId: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [coreIdentity, setCoreIdentity] = useState("");
  const [designPhilosophy, setDesignPhilosophy] = useState("");
  const [portraitUrl, setPortraitUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setName("");
    setRole("");
    setCoreIdentity("");
    setDesignPhilosophy("");
    setPortraitUrl("");
    setEditing(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.url) setPortraitUrl(json.url);
    } finally {
      setUploading(false);
    }
  };

  const save = () => {
    if (!name.trim() || !role.trim()) return;
    startTransition(async () => {
      await createCharacter(projectId, {
        name: name.trim(),
        role: role.trim(),
        coreIdentity: coreIdentity.trim() || undefined,
        designPhilosophy: designPhilosophy.trim() || undefined,
      });
      reset();
    });
  };

  if (!editing) {
    return (
      <Card
        className="border-dashed border-2 hover:border-primary/30 cursor-pointer transition-all flex items-center justify-center min-h-[200px]"
        onClick={() => setEditing(true)}
      >
        <CardContent className="flex flex-col items-center gap-2 py-8">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Add Character
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 shadow-md">
      <CardHeader>
        <div className="flex items-start gap-4">
          <div
            className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden border-2 border-dashed border-primary/30"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : portraitUrl ? (
              <Image
                src={portraitUrl}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
                sizes="56px"
                quality={70}
              />
            ) : (
              <Upload className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <div className="flex-1 space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name"
              className="font-semibold"
              autoFocus
            />
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Role (e.g. Protagonist)"
              className="text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={coreIdentity}
          onChange={(e) => setCoreIdentity(e.target.value)}
          rows={2}
          placeholder="Core identity..."
          className="text-sm"
        />
        <Textarea
          value={designPhilosophy}
          onChange={(e) => setDesignPhilosophy(e.target.value)}
          rows={2}
          placeholder="Design philosophy..."
          className="text-sm"
        />
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={isPending}
            className="gap-1"
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={isPending || !name.trim() || !role.trim()}
            className="gap-1"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Characters Client ─────────────────────────────────

export function CharactersClient({
  projectId,
  projectName,
  characters,
}: {
  projectId: string;
  projectName: string;
  characters: CharacterItem[];
}) {
  const [deleteChar, setDeleteChar] = useState<CharacterItem | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return characters;
    const q = search.toLowerCase();
    return characters.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.coreIdentity?.toLowerCase().includes(q) ?? false) ||
        c.visualCues.some((v) => v.toLowerCase().includes(q)),
    );
  }, [characters, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-foreground transition-colors"
          >
            {projectName}
          </Link>
          <span>/</span>
          <span className="text-foreground">Characters</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Characters</h1>
        <p className="text-muted-foreground mt-1">
          {characters.length} character{characters.length !== 1 ? "s" : ""} in
          this project
        </p>
      </div>

      {/* Search */}
      {characters.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="pl-9"
          />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((char) => (
          <CharacterCard
            key={char.id}
            char={char}
            projectId={projectId}
            onDelete={setDeleteChar}
          />
        ))}
        <AddCharacterCard projectId={projectId} />
      </div>

      {deleteChar && (
        <DeleteDialog
          open={!!deleteChar}
          onOpenChange={(v) => !v && setDeleteChar(null)}
          title={`Delete ${deleteChar.name}?`}
          description="This action cannot be undone. The character will be permanently removed."
          onDelete={async () => {
            await deleteCharacter(deleteChar.id);
            setDeleteChar(null);
          }}
        />
      )}
    </div>
  );
}
