"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

import styles from "./page.module.css";

type FolderPreview = {
  thumbnail: string | null;
  caption: string | null;
};

type Folder = {
  id: string;
  name: string;
  cover: string | null;
  postsCount: number;
  preview: FolderPreview | null;
};

type Post = {
  id: string;
  url: string;
  thumbnail: string | null;
  caption: string | null;
  createdAt: string;
};

type FlashState = {
  type: "success" | "error";
  text: string;
};

type ViewMode = "grid" | "folder";

function getInstagramThumbnailSrc(url: string | null): string | null {
  if (!url) return null;
  try {
    return `/api/instagram-thumbnail?url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  throw new Error("Resposta inválida do servidor");
}

export function DashboardClient() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const [folderFormOpen, setFolderFormOpen] = useState(false);
  const [postFormOpen, setPostFormOpen] = useState(false);
  const [folderForm, setFolderForm] = useState({ name: "", cover: "" });
  const [postUrl, setPostUrl] = useState("");

  const [flash, setFlash] = useState<FlashState | null>(null);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [savingFolder, setSavingFolder] = useState(false);
  const [savingPost, setSavingPost] = useState(false);

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const fetchFolders = useCallback(async (): Promise<Folder[]> => {
    const response = await fetch("/api/folders", { cache: "no-store" });
    if (!response.ok) {
      const body = await parseResponse<{ error?: string }>(response).catch(() => ({
        error: "Não foi possível carregar as pastas.",
      }));
      throw new Error(body.error ?? "Não foi possível carregar as pastas.");
    }
    return parseResponse<Folder[]>(response);
  }, []);

  const refreshFolders = useCallback(async () => {
    setLoadingFolders(true);
    try {
      const data = await fetchFolders();
      setFolders(data);
      setSelectedFolderId((current) =>
        current && data.some((folder) => folder.id === current) ? current : null,
      );
    } catch (error) {
      setFlash({ type: "error", text: (error as Error).message });
      setFolders([]);
      setSelectedFolderId(null);
      setViewMode("grid");
    } finally {
      setLoadingFolders(false);
    }
  }, [fetchFolders]);

  const refreshPosts = useCallback(async (folderId: string) => {
    setLoadingPosts(true);
    try {
      const response = await fetch(`/api/posts?folderId=${folderId}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await parseResponse<{ error?: string }>(response).catch(() => ({
          error: "Não foi possível carregar os posts.",
        }));
        throw new Error(body.error ?? "Não foi possível carregar os posts.");
      }
      const data = await parseResponse<Post[]>(response);
      setPosts(data);
    } catch (error) {
      setFlash({ type: "error", text: (error as Error).message });
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  useEffect(() => {
    if (!selectedFolderId) {
      setPosts([]);
      return;
    }
    refreshPosts(selectedFolderId);
  }, [refreshPosts, selectedFolderId]);

  function resetFlash() {
    setFlash(null);
  }

  function openFolder(folderId: string) {
    setSelectedFolderId(folderId);
    setViewMode("folder");
    setFolderFormOpen(false);
    setPostFormOpen(false);
  }

  function handleBackToGrid() {
    setSelectedFolderId(null);
    setViewMode("grid");
    setPostFormOpen(false);
  }

  async function handleCreateFolder(event: React.FormEvent) {
    event.preventDefault();
    resetFlash();

    if (!folderForm.name.trim()) {
      setFlash({ type: "error", text: "Informe um nome para a pasta." });
      return;
    }

    setSavingFolder(true);
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: folderForm.name.trim(),
          cover: folderForm.cover.trim() || null,
        }),
      });

      if (!response.ok) {
        const body = await parseResponse<{ error?: string }>(response).catch(() => ({
          error: "Não foi possível criar a pasta.",
        }));
        throw new Error(body.error ?? "Não foi possível criar a pasta.");
      }

      const created = await parseResponse<Folder>(response);
      setFolderForm({ name: "", cover: "" });
      setFolderFormOpen(false);
      setFlash({ type: "success", text: "Pasta criada com sucesso." });
      await refreshFolders();
      setSelectedFolderId(created.id);
      setViewMode("folder");
    } catch (error) {
      setFlash({ type: "error", text: (error as Error).message });
    } finally {
      setSavingFolder(false);
    }
  }

  async function handleCreatePost(event: React.FormEvent) {
    event.preventDefault();
    resetFlash();

    if (!selectedFolderId) {
      setFlash({ type: "error", text: "Selecione uma pasta antes de salvar um link." });
      return;
    }

    const parsedUrls = postUrl
      .split(/[,\n]+/)
      .map((candidate) => candidate.trim())
      .filter(Boolean);
    const urls = Array.from(new Set(parsedUrls));

    if (urls.length === 0) {
      setFlash({ type: "error", text: "Informe ao menos um link para salvar." });
      return;
    }

    setSavingPost(true);
    try {
      const createdPosts: Post[] = [];

      for (const url of urls) {
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, folderId: selectedFolderId }),
        });

        if (!response.ok) {
          const body = await parseResponse<{ error?: string }>(response).catch(() => ({
            error: "Não foi possível salvar o link.",
          }));
          const reason = body.error ?? "Não foi possível salvar o link.";
          throw new Error(`${reason} (${url})`);
        }

        const created = await parseResponse<Post>(response);
        if (created) createdPosts.push(created);
      }

      setPostUrl("");
      setPostFormOpen(false);
      const successCount = createdPosts.length;
      const successMessage =
        successCount === 1
          ? "Link salvo com sucesso."
          : `${successCount} links salvos com sucesso.`;
      setFlash({ type: "success", text: successMessage });
      await Promise.all([refreshPosts(selectedFolderId), refreshFolders()]);
    } catch (error) {
      setFlash({ type: "error", text: (error as Error).message });
    } finally {
      setSavingPost(false);
    }
  }

  const deleteFolder = useCallback(
    async (id: string) => {
      resetFlash();
      const target = folders.find((folder) => folder.id === id);
      const folderName = target?.name ?? "esta pasta";
      if (!window.confirm(`Excluir ${folderName}? Essa ação não pode ser desfeita.`)) {
        return;
      }

      const response = await fetch(`/api/folders/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await parseResponse<{ error?: string }>(response).catch(() => ({
          error: "Não foi possível excluir a pasta.",
        }));
        setFlash({ type: "error", text: body.error ?? "Não foi possível excluir a pasta." });
        return;
      }

      setFlash({ type: "success", text: "Pasta excluída." });
      await refreshFolders();
      if (selectedFolderId === id) {
        setSelectedFolderId(null);
        setViewMode("grid");
        setPosts([]);
      }
    },
    [folders, refreshFolders, selectedFolderId],
  );

  const deletePost = useCallback(
    async (id: string) => {
      if (!selectedFolderId) return;
      if (!window.confirm("Deseja remover este link?")) return;

      const response = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await parseResponse<{ error?: string }>(response).catch(() => ({
          error: "Não foi possível remover o link.",
        }));
        setFlash({ type: "error", text: body.error ?? "Não foi possível remover o link." });
        return;
      }

      setFlash({ type: "success", text: "Link removido." });
      await refreshPosts(selectedFolderId);
      await refreshFolders();
    },
    [refreshFolders, refreshPosts, selectedFolderId],
  );

  const summaryTitle = viewMode === "folder" && selectedFolder ? selectedFolder.name : "Pastas";
  const summarySubtitle =
    viewMode === "folder" && selectedFolder
      ? `${selectedFolder.postsCount} ${selectedFolder.postsCount === 1 ? "registro" : "registros"} preservados neste arquivo.`
      : "Colecione referências e organize seus achados do Instagram em álbuns.";

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <span className={styles.brand}>BLANK ARCHIVE</span>
          {viewMode === "folder" && selectedFolder && (
            <button type="button" className={styles.backButton} onClick={handleBackToGrid}>
              ← Voltar para pastas
            </button>
          )}
        </div>
        <div className={styles.topActions}>
          <button
            type="button"
            className={styles.topButton}
            onClick={() => setFolderFormOpen(true)}
          >
            Criar pasta
          </button>
          <button
            type="button"
            className={styles.topButton}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sair
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <div>
            <h1 className={styles.title}>{summaryTitle}</h1>
            <p className={styles.subtitle}>{summarySubtitle}</p>
          </div>
          {viewMode === "folder" && selectedFolder && (
            <button
              type="button"
              className={styles.highlightButton}
              onClick={() => setPostFormOpen((state) => !state)}
            >
              {postFormOpen ? "Cancelar" : "Salvar novo link"}
            </button>
          )}
        </section>

        {flash && (
          <div
            role="alert"
            className={`${styles.flash} ${
              flash.type === "error" ? styles.flashError : styles.flashSuccess
            }`}
          >
            {flash.text}
            <button
              type="button"
              className={styles.flashClose}
              onClick={resetFlash}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}

        {folderFormOpen && viewMode === "grid" && (
          <form className={styles.panel} onSubmit={handleCreateFolder}>
            <div className={styles.formRow}>
              <label className={styles.label}>
                Nome da pasta
                <input
                  className={styles.input}
                  value={folderForm.name}
                  onChange={(event) =>
                    setFolderForm((state) => ({ ...state, name: event.target.value }))
                  }
                  placeholder="Ex.: Mansões"
                />
              </label>
              <label className={styles.label}>
                Capa (opcional)
                <input
                  className={styles.input}
                  value={folderForm.cover}
                  onChange={(event) =>
                    setFolderForm((state) => ({ ...state, cover: event.target.value }))
                  }
                  placeholder="URL de imagem"
                />
              </label>
            </div>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setFolderFormOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={savingFolder}>
                {savingFolder ? "Salvando..." : "Salvar pasta"}
              </button>
            </div>
          </form>
        )}

        {postFormOpen && viewMode === "folder" && selectedFolder && (
          <form className={styles.panel} onSubmit={handleCreatePost}>
            <div className={styles.formRow}>
              <label className={styles.label}>
                Link do post
                <input
                  className={styles.input}
                  value={postUrl}
                  onChange={(event) => setPostUrl(event.target.value)}
                  placeholder="Cole os links separados por vírgula ou quebra de linha"
                />
              </label>
            </div>
            <div className={styles.panelActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setPostFormOpen(false)}
              >
                Cancelar
              </button>
              <button type="submit" className={styles.primaryButton} disabled={savingPost}>
                {savingPost ? "Salvando..." : "Salvar link"}
              </button>
            </div>
          </form>
        )}

        {viewMode === "grid" ? (
          <section className={styles.gridSection}>
            {loadingFolders ? (
              <p className={styles.helperText}>Carregando pastas...</p>
            ) : folders.length === 0 ? (
              <p className={styles.helperText}>
                Você ainda não criou pastas. Comece adicionando o primeiro álbum.
              </p>
            ) : (
              <ul className={styles.folderGrid}>
                {folders.map((folder) => {
                  const previewImageRaw = folder.preview?.thumbnail ?? folder.cover ?? null;
                  const previewImage = getInstagramThumbnailSrc(previewImageRaw);
                  return (
                    <li key={folder.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        className={styles.folderCard}
                        onClick={() => openFolder(folder.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openFolder(folder.id);
                          }
                        }}
                      >
                        <div
                          className={styles.folderPreview}
                          style={
                            previewImage
                              ? { backgroundImage: `url(${previewImage})` }
                              : undefined
                          }
                        />
                        <div className={styles.folderOverlay}>
                          <span className={styles.folderTitle}>{folder.name}</span>
                          <span className={styles.folderCount}>
                            {folder.postsCount} {folder.postsCount === 1 ? "item" : "itens"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className={styles.folderDelete}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          aria-label={`Excluir ${folder.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className={styles.gridSection}>
            {loadingPosts ? (
              <p className={styles.helperText}>Carregando posts...</p>
            ) : !selectedFolder ? (
              <p className={styles.helperText}>
                Selecionamos a pasta, mas algo deu errado. Volte e tente novamente.
              </p>
            ) : posts.length === 0 ? (
              <p className={styles.helperText}>
                Esta pasta ainda não tem links salvos. Salve um post para começar.
              </p>
            ) : (
              <ul className={styles.postGrid}>
                {posts.map((post) => {
                  const thumbnailSrc = getInstagramThumbnailSrc(post.thumbnail);
                  return (
                    <li key={post.id} className={styles.postCard}>
                      <button
                        type="button"
                        className={styles.postDelete}
                        onClick={() => deletePost(post.id)}
                        aria-label="Remover link"
                      >
                        ×
                      </button>
                      <div className={styles.postPreview}>
                        {thumbnailSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailSrc}
                            alt="Prévia do post"
                            className={styles.postPreviewImage}
                            loading="lazy"
                          />
                        ) : (
                          <span className={styles.postPlaceholder}>Sem prévia</span>
                        )}
                      </div>
                      <div className={styles.postInfo}>
                        <p className={styles.postCaption}>
                          {post.caption || "Sem legenda disponível."}
                        </p>
                      <div className={styles.postMeta}>
                        <time>
                          {new Date(post.createdAt).toLocaleDateString("pt-BR")}
                        </time>
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.postLink}
                        >
                          Abrir post →
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
