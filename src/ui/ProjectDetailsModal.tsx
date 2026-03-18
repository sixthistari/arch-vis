import React, { useState, useEffect } from 'react';
import { useProjectStore } from '../store/project';

interface ProjectDetailsModalProps {
  mode: 'new' | 'edit';
  onClose: () => void;
}

export function ProjectDetailsModal({ mode, onClose }: ProjectDetailsModalProps): React.ReactElement {
  const currentProjectId = useProjectStore(s => s.currentProjectId);
  const projects = useProjectStore(s => s.projects);
  const createProject = useProjectStore(s => s.createProject);
  const updateProject = useProjectStore(s => s.updateProject);
  const deleteProject = useProjectStore(s => s.deleteProject);
  const switchProject = useProjectStore(s => s.switchProject);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const [name, setName] = useState(mode === 'edit' ? (currentProject?.name ?? '') : '');
  const [description, setDescription] = useState(mode === 'edit' ? (currentProject?.description ?? '') : '');
  const [saving, setSaving] = useState(false);
  const [dbType, setDbType] = useState<'sqlite' | 'postgresql'>('sqlite');
  const [sqlitePath, setSqlitePath] = useState('data/arch-vis.db');
  const [pgHost, setPgHost] = useState('');
  const [pgPort, setPgPort] = useState('');
  const [pgDatabase, setPgDatabase] = useState('');
  const [pgUsername, setPgUsername] = useState('');
  const [pgPassword, setPgPassword] = useState('');
  const [pgSslMode, setPgSslMode] = useState<'disable' | 'require' | 'verify-ca' | 'verify-full'>('disable');

  // Compose the connection string from individual fields
  const composedConnectionString = dbType === 'sqlite'
    ? `sqlite:${sqlitePath}`
    : `postgresql://${pgUsername}${pgPassword ? ':' + pgPassword : ''}@${pgHost || 'localhost'}:${pgPort || '5432'}/${pgDatabase}?sslmode=${pgSslMode}`;

  // Parse a connection_string back into individual fields
  const parseConnectionString = (cs: string) => {
    if (cs.startsWith('sqlite:')) {
      setDbType('sqlite');
      setSqlitePath(cs.slice('sqlite:'.length));
    } else if (cs.startsWith('postgresql://') || cs.startsWith('postgres://')) {
      setDbType('postgresql');
      try {
        const url = new URL(cs);
        setPgHost(url.hostname);
        setPgPort(url.port || '5432');
        setPgDatabase(url.pathname.replace(/^\//, ''));
        setPgUsername(decodeURIComponent(url.username));
        setPgPassword(decodeURIComponent(url.password));
        const sslParam = url.searchParams.get('sslmode');
        if (sslParam && ['disable', 'require', 'verify-ca', 'verify-full'].includes(sslParam)) {
          setPgSslMode(sslParam as 'disable' | 'require' | 'verify-ca' | 'verify-full');
        }
      } catch {
        // If URL parsing fails, leave defaults
      }
    }
  };

  // Update fields if project changes while open
  useEffect(() => {
    if (mode === 'edit' && currentProject) {
      setName(currentProject.name);
      setDescription(currentProject.description ?? '');
      if (currentProject.connection_string) {
        parseConnectionString(currentProject.connection_string);
      }
    }
  }, [mode, currentProject]);

  const isDefault = currentProjectId === 'proj-default';

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      if (mode === 'new') {
        const proj = await createProject({
          name: trimmedName,
          description: description.trim() || undefined,
          connection_string: composedConnectionString,
        });
        await switchProject(proj.id);
      } else if (currentProjectId) {
        await updateProject(currentProjectId, {
          name: trimmedName,
          description: description.trim() || null,
          connection_string: composedConnectionString,
        });
      }
      onClose();
    } catch (err) {
      console.error('Project save failed:', err);
      window.alert(`Failed to save project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentProjectId || isDefault) return;
    if (!window.confirm(`Delete project "${currentProject?.name}"? All its elements, relationships, and views will be permanently deleted.`)) return;
    setSaving(true);
    try {
      await deleteProject(currentProjectId);
      onClose();
    } catch (err) {
      console.error('Project delete failed:', err);
      window.alert(`Failed to delete project: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const dialogStyle: React.CSSProperties = {
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: 8,
    width: 480,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '14px 18px',
    borderBottom: '1px solid var(--border-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '16px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '6px 8px',
    fontSize: 12,
    background: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: 4,
    outline: 'none',
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: 60,
    resize: 'vertical',
    fontFamily: 'inherit',
  };

  const btnStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: 11,
    borderRadius: 4,
    border: '1px solid var(--border-primary)',
    cursor: 'pointer',
    background: 'var(--button-bg, #333)',
    color: 'var(--button-fg, #ccc)',
  };

  const footerStyle: React.CSSProperties = {
    padding: '12px 18px',
    borderTop: '1px solid var(--border-secondary)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  };

  return (
    <div
      style={overlayStyle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={dialogStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {mode === 'new' ? 'New Project' : 'Project Settings'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 18,
              padding: '0 4px',
            }}
          >
            {'\u00D7'}
          </button>
        </div>

        {/* Body */}
        <div style={bodyStyle}>
          <div>
            <label style={labelStyle}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="Project name\u2026"
              autoFocus
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description\u2026"
              style={textareaStyle}
            />
          </div>

          {/* Database Connection */}
          <div>
            <label style={labelStyle}>Database Type</label>
            <select
              value={dbType}
              onChange={(e) => setDbType(e.target.value as 'sqlite' | 'postgresql')}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="sqlite">SQLite</option>
              <option value="postgresql">PostgreSQL</option>
            </select>
          </div>

          {dbType === 'sqlite' && (
            <div>
              <label style={labelStyle}>File Path</label>
              <input
                value={sqlitePath}
                onChange={(e) => setSqlitePath(e.target.value)}
                placeholder="data/arch-vis.db"
                style={inputStyle}
              />
            </div>
          )}

          {dbType === 'postgresql' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Host</label>
                  <input
                    value={pgHost}
                    onChange={(e) => setPgHost(e.target.value)}
                    placeholder="localhost"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Port</label>
                  <input
                    value={pgPort}
                    onChange={(e) => setPgPort(e.target.value)}
                    placeholder="5432"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Database</label>
                <input
                  value={pgDatabase}
                  onChange={(e) => setPgDatabase(e.target.value)}
                  placeholder="arch_vis"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={labelStyle}>Username</label>
                  <input
                    value={pgUsername}
                    onChange={(e) => setPgUsername(e.target.value)}
                    placeholder="postgres"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={pgPassword}
                    onChange={(e) => setPgPassword(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>SSL Mode</label>
                <select
                  value={pgSslMode}
                  onChange={(e) => setPgSslMode(e.target.value as 'disable' | 'require' | 'verify-ca' | 'verify-full')}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="disable">disable</option>
                  <option value="require">require</option>
                  <option value="verify-ca">verify-ca</option>
                  <option value="verify-full">verify-full</option>
                </select>
              </div>
            </>
          )}

          {/* Composed connection string (read-only) */}
          <div>
            <label style={labelStyle}>Connection String</label>
            <input
              value={composedConnectionString}
              readOnly
              style={{ ...inputStyle, opacity: 0.7, cursor: 'default', fontFamily: 'monospace', fontSize: 11 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          <div>
            {mode === 'edit' && !isDefault && (
              <button
                onClick={handleDelete}
                disabled={saving}
                style={{
                  ...btnStyle,
                  color: '#e05252',
                  borderColor: '#e0525244',
                  background: 'transparent',
                }}
              >
                Delete Project
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btnStyle} disabled={saving}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              style={{
                ...btnStyle,
                background: 'var(--highlight, #4a9eff)',
                color: '#fff',
                borderColor: 'var(--highlight, #4a9eff)',
                opacity: (saving || !name.trim()) ? 0.5 : 1,
              }}
            >
              {mode === 'new' ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
