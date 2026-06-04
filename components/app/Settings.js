// components/app/Settings.js
"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Sun,
  Moon,
  Contrast,
  LayoutGrid,
  List,
  BarChart3,
  Image as ImageIcon,
  Trash2,
  Laptop,
  Square,
  SquareDot,
  Grid3x3,
  Check,
  X,
  Save as SaveIcon,
  RotateCcw,
  Palette,
  Eye,
  Settings as SettingsIcon,
  AlertTriangle,
  User as UserIcon,
  Shield,
  Download
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import ConfirmModal from "./ConfirmModal";
import { api } from "@/utils/api";
import style from "./Settings.module.css";
import SoftLoading from "../SoftLoading";
import gravatar from "gravatar";

export default function Settings({ onClose, onViewModeChange, onSortByChange, onThemeChange, onThumbnailResolutionChange, isMobile = false, initialSection = "profile" }) {
  const { user, signout } = useAuth();

  const [theme, setTheme] = useState("device");
  const [defaultView, setDefaultView] = useState("details");
  const [defaultSort, setDefaultSort] = useState("name");
  const [imageQuality, setImageQuality] = useState("best");
  const [uploadQuality, setUploadQuality] = useState("best");
  const [thumbnailResolution, setThumbnailResolution] = useState("medium");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const [activeSection, setActiveSection] = useState(initialSection || "profile");

  useEffect(() => {
    if (initialSection) {
      setActiveSection(initialSection);
    }
  }, [initialSection]);

  // Account deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Export data states
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState('both');
  const [isExporting, setIsExporting] = useState(false);

  const [initialSettings, setInitialSettings] = useState(null);
  const [sessionTokens, setSessionTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [tokensError, setTokensError] = useState("");
  const [revokingTokenId, setRevokingTokenId] = useState("");
  const [sessionActionLoading, setSessionActionLoading] = useState("");

  const saveSettings = async (settingsToUpdate, showNotification = true) => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const response = await api.post('/api/user/settings', settingsToUpdate);

      if (response.success) {
        if (showNotification) {
          setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
          setTimeout(() => setSaveMessage(null), 3000);
        }
        setHasUnsavedChanges(false);
        const newSettings = { theme, defaultView, defaultSort, imageQuality, uploadQuality, thumbnailResolution, ...settingsToUpdate };
        setInitialSettings(newSettings);
      } else {
        if (showNotification) {
          setSaveMessage({ type: 'error', text: 'Failed to save settings' });
          setTimeout(() => setSaveMessage(null), 5000);
        }
        Object.entries(settingsToUpdate).forEach(([key, value]) => {
          localStorage.setItem(`cloud-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
        });
      }
    } catch (error) {
      if (showNotification) {
        setSaveMessage({ type: 'error', text: 'Error saving settings' });
        setTimeout(() => setSaveMessage(null), 5000);
      }
      Object.entries(settingsToUpdate).forEach(([key, value]) => {
        localStorage.setItem(`cloud-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = () => {
    if (!hasUnsavedChanges) return;
    saveSettings({ theme, defaultView, defaultSort, imageQuality, uploadQuality, thumbnailResolution }, true);
  };

  const handleResetSettings = () => {
    if (!initialSettings) return;
    setTheme(initialSettings.theme);
    setDefaultView(initialSettings.defaultView);
    setDefaultSort(initialSettings.defaultSort);
    setImageQuality(initialSettings.imageQuality);
    setUploadQuality(initialSettings.uploadQuality);
    setThumbnailResolution(initialSettings.thumbnailResolution);
    setHasUnsavedChanges(false);
    setSaveMessage({ type: 'info', text: 'Settings reset to saved values' });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.get('/api/user/settings');
        if (response.success && response.settings) {
          const settings = response.settings;
          setTheme(settings.theme);
          setDefaultView(settings.defaultView);
          setDefaultSort(settings.defaultSort);
          setImageQuality(settings.imageQuality);
          setUploadQuality(settings.uploadQuality);
          setThumbnailResolution(settings.thumbnailResolution);
          setInitialSettings(settings);
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('cloud-theme') || 'device';
          const savedView = localStorage.getItem('cloud-default-view') || 'details';
          const savedSort = localStorage.getItem('cloud-default-sort') || 'name';
          const savedImageQuality = localStorage.getItem('cloud-image-quality') || 'best';
          const savedUploadQuality = localStorage.getItem('cloud-upload-quality') || 'best';
          const savedThumbnailResolution = localStorage.getItem('cloud-thumbnail-resolution') || 'medium';

          setTheme(savedTheme);
          setDefaultView(savedView);
          setDefaultSort(savedSort);
          setImageQuality(savedImageQuality);
          setUploadQuality(savedUploadQuality);
          setThumbnailResolution(savedThumbnailResolution);
          setInitialSettings({ theme: savedTheme, defaultView: savedView, defaultSort: savedSort, imageQuality: savedImageQuality, uploadQuality: savedUploadQuality, thumbnailResolution: savedThumbnailResolution });
        }
      } finally {
        setSettingsLoaded(true);
      }
    };

    if (user) {
      loadSettings();
    }
  }, [user]);

  useEffect(() => {
    if (!settingsLoaded || !initialSettings) return;
    const changed = theme !== initialSettings.theme ||
      defaultView !== initialSettings.defaultView ||
      defaultSort !== initialSettings.defaultSort ||
      imageQuality !== initialSettings.imageQuality ||
      uploadQuality !== initialSettings.uploadQuality ||
      thumbnailResolution !== initialSettings.thumbnailResolution
    setHasUnsavedChanges(changed);
  }, [theme, defaultView, defaultSort, imageQuality, uploadQuality, thumbnailResolution, initialSettings, settingsLoaded, user]);

  useEffect(() => {
    if (typeof window !== 'undefined' && settingsLoaded && theme) {
      const html = document.documentElement;

      html.removeAttribute('data-theme');
      html.removeAttribute('data-color-scheme');

      switch (theme) {
        case 'light':
          html.setAttribute('data-color-scheme', 'light');
          break;
        case 'dark':
          html.setAttribute('data-color-scheme', 'dark');
          break;
        case 'high-contrast':
          html.setAttribute('data-theme', 'high-contrast');
          break;
        case 'device':
        default:
          break;
      }

      if (onThemeChange) {
        onThemeChange(theme);
      }
    }
  }, [theme, settingsLoaded, onThemeChange]);

  useEffect(() => {
    if (settingsLoaded && !isMobile && defaultView) {
      if (onViewModeChange) {
        onViewModeChange(defaultView);
      }
    }
  }, [defaultView, onViewModeChange, settingsLoaded, isMobile]);

  useEffect(() => {
    if (settingsLoaded && defaultSort) {
      if (onSortByChange) {
        onSortByChange(defaultSort);
      }
    }
  }, [defaultSort, onSortByChange, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded && thumbnailResolution) {
      if (onThumbnailResolutionChange) {
        onThumbnailResolutionChange(thumbnailResolution);
      }
    }
  }, [thumbnailResolution, onThumbnailResolutionChange, settingsLoaded]);

  const loadSessionTokens = async () => {
    setTokensLoading(true);
    setTokensError("");
    try {
      const response = await api.get('/api/user/client-tokens');
      if (response?.success) {
        setSessionTokens(Array.isArray(response.tokens) ? response.tokens : []);
      } else {
        setTokensError('Failed to load session tokens.');
      }
    } catch {
      setTokensError('Failed to load session tokens.');
    } finally {
      setTokensLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadSessionTokens();
  }, [user]);

  const handleRevokeToken = async (tokenId) => {
    if (!tokenId) return;
    setRevokingTokenId(tokenId);

    const previous = sessionTokens;
    setSessionTokens((current) => current.filter((token) => token.tokenId !== tokenId));

    try {
      const response = await api.post('/api/user/client-tokens', { action: 'revoke', tokenId });
      if (!response?.success) {
        setSessionTokens(previous);
        setTokensError('Failed to revoke token.');
        return;
      }

      if (Array.isArray(response.tokens)) {
        setSessionTokens(response.tokens);
      }
    } catch {
      setSessionTokens(previous);
      setTokensError('Failed to revoke token.');
    } finally {
      setRevokingTokenId('');
    }
  };

  const handleClearRevokedTokens = async () => {
    setSessionActionLoading('clear_revoked');
    setTokensError('');
    try {
      const response = await api.post('/api/user/client-tokens', { action: 'clear_revoked' });
      if (!response?.success) {
        setTokensError('Failed to clear revoked tokens.');
        return;
      }

      if (Array.isArray(response.tokens)) {
        setSessionTokens(response.tokens);
      } else {
        await loadSessionTokens();
      }
    } catch {
      setTokensError('Failed to clear revoked tokens.');
    } finally {
      setSessionActionLoading('');
    }
  };

  const handleRevokeAllOtherDevices = async () => {
    setSessionActionLoading('revoke_all_other');
    setTokensError('');
    try {
      const response = await api.post('/api/user/client-tokens', { action: 'revoke_all_other' });
      if (!response?.success) {
        setTokensError('Failed to revoke other devices.');
        return;
      }

      if (Array.isArray(response.tokens)) {
        setSessionTokens(response.tokens);
      } else {
        await loadSessionTokens();
      }
    } catch {
      setTokensError('Failed to revoke other devices.');
    } finally {
      setSessionActionLoading('');
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      alert("Please enter your password");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await api.post('/api/user/delete', {
        password: deletePassword
      });

      if (response.success) {
        alert('Your account has been disabled and scheduled for deletion in 30 days. You have been logged out of all devices.');
        await signout();
      } else {
        alert(response.message || "Failed to delete account. Please check your password.");
      }
    } catch (error) {
      alert("An error occurred while deleting your account. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeletePassword("");
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await api.post('/api/user/export-data', {
        exportType: exportType
      });

      // Create blob from response and download
      const blob = new Blob([response], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cloud-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Your data has been exported and downloaded successfully!');
      setShowExportModal(false);
    } catch (error) {
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: <Sun size={18} /> },
    { value: "dark", label: "Dark", icon: <Moon size={18} /> },
    { value: "high-contrast", label: "High Contrast", icon: <Contrast size={18} /> },
    { value: "device", label: "System", icon: <Laptop size={18} /> }
  ];

  const viewOptions = [
    { value: "extraLargeIcons", label: "Extra Large Icons", icon: <ImageIcon size={18} /> },
    { value: "largeIcons", label: "Large Icons", icon: <Square size={18} /> },
    { value: "mediumIcons", label: "Medium Icons", icon: <SquareDot size={18} /> },
    { value: "smallIcons", label: "Small Icons", icon: <Grid3x3 size={18} /> },
    { value: "list", label: "List", icon: <List size={18} /> },
    { value: "details", label: "Details", icon: <BarChart3 size={18} /> },
    { value: "tiles", label: "Tiles", icon: <LayoutGrid size={18} /> }
  ];

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "date", label: "Date Modified" },
    { value: "size", label: "Size" },
    { value: "type", label: "Type" }
  ];

  const qualityOptions = [
    { value: "best", label: "Best Quality" },
    { value: "medium", label: "Medium Quality" },
    { value: "low", label: "Low Quality" }
  ];

  const thumbnailResolutionOptions = [
    { value: "high", label: "High (1920x1080)" },
    { value: "medium", label: "Medium (1280x720)" },
    { value: "low", label: "Low (854x480)" }
  ];

  const sections = [
    { id: "profile", label: "Profile", icon: <UserIcon size={20} /> },
    { id: "sessions", label: "Sessions", icon: <Shield size={20} /> },
    { id: "appearance", label: "Appearance", icon: <Palette size={20} /> },
    { id: "view", label: "View & Display", icon: <Eye size={20} /> },
    { id: "performance", label: "Performance", icon: <SettingsIcon size={20} /> },
    { id: "danger", label: "Danger Zone", icon: <AlertTriangle size={20} /> }
  ];

  const SettingCard = ({ title, description, children }) => (
    <div className={style.settingCard}>
      <div className={style.settingCardHeader}>
        <h3 className={style.settingCardTitle}>{title}</h3>
        {description && <p className={style.settingCardDescription}>{description}</p>}
      </div>
      <div className={style.settingCardContent}>
        {children}
      </div>
    </div>
  );

  const OptionButton = ({ option, selected, onChange }) => (
    <button
      className={`${style.optionButton} ${selected === option.value ? style.selected : ''}`}
      onClick={() => onChange(option.value)}
    >
      {option.icon && <span className={style.optionIcon}>{option.icon}</span>}
      <span className={style.optionLabel}>{option.label}</span>
      {selected === option.value && <Check size={16} className={style.checkIcon} />}
    </button>
  );

  if (!settingsLoaded || !user) return <SoftLoading />;

  return (
    <>
      <div className={style.settings}>
        {!isMobile && (
          <div className={style.header}>
            <div className={style.headerTop}>
              <h1 className={style.title}>Settings</h1>
              {isMobile && (
                <button className={style.closeButton} onClick={onClose}>
                  <X size={24} />
                </button>
              )}
            </div>
            {hasUnsavedChanges && (
              <div className={style.unsavedBanner}>
                <span>You have unsaved changes</span>
                <div className={style.bannerActions}>
                  <button className={style.resetButton} onClick={handleResetSettings}>
                    <RotateCcw size={16} />
                    Reset
                  </button>
                  <button
                    className={style.saveButton}
                    onClick={handleSaveAll}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <SoftLoading />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon size={16} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            {saveMessage && (
              <div className={`${style.saveMessage} ${style[saveMessage.type]}`}>
                {saveMessage.text}
              </div>
            )}
          </div>
        )}

        <div className={style.content}>
          <div className={style.sidebar}>
            {sections.map(section => (
              <button
                key={section.id}
                className={`${style.sidebarItem} ${activeSection === section.id ? style.active : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.icon}
                <span>{section.label}</span>
              </button>
            ))}
          </div>

          <div className={style.mainContent}>
            {activeSection === "profile" && (
              <>
                <SettingCard
                  title="User Profile"
                  description="Manage your profile picture and username via Gravatar"
                >
                  <div className={style.profileSection}>
                    <div className={style.profileImageSection}>
                      <img
                        src={gravatar.url(user?.email || '', { s: "120", r: "pg", d: "identicon" })}
                        alt="Profile"
                        className={style.profileImage}
                      />
                      <p className={style.gravatarInfo}>
                        Your profile picture is managed through <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer">Gravatar</a>
                      </p>
                    </div>
                    <div className={style.profileDetailsSection}>
                      <div className={style.profileActions}>
                        <a
                          href="https://gravatar.com/emails/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className={style.gravatarButton}
                        >
                          Edit Profile on Gravatar
                        </a>
                      </div>
                      <p className={style.fieldHelp}>
                        Click the button below to manage your profile picture on Gravatar. Changes will automatically appear here after some time.
                      </p>
                    </div>
                  </div>
                </SettingCard>
              </>
            )}

            {activeSection === "appearance" && (
              <SettingCard
                title="Theme"
                description="Choose how Cloud looks to you"
              >
                <div className={style.optionGrid}>
                  {themeOptions.map(option => (
                    <OptionButton
                      key={option.value}
                      option={option}
                      selected={theme}
                      onChange={setTheme}
                    />
                  ))}
                </div>
              </SettingCard>
            )}

            {activeSection === "sessions" && (
              <SettingCard
                title="Session Tokens"
                description="View and revoke active browser sessions for your account"
              >
                <div className={style.sessionActions}>
                  <button className={style.resetButton} onClick={loadSessionTokens} disabled={tokensLoading}>
                    {tokensLoading ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    className={style.resetButton}
                    onClick={handleClearRevokedTokens}
                    disabled={sessionActionLoading === 'clear_revoked' || tokensLoading || !!revokingTokenId}
                  >
                    {sessionActionLoading === 'clear_revoked' ? 'Clearing...' : 'Clear Revoked Tokens'}
                  </button>
                  <button
                    className={style.dangerButton}
                    onClick={handleRevokeAllOtherDevices}
                    disabled={sessionActionLoading === 'revoke_all_other' || tokensLoading || !!revokingTokenId}
                  >
                    {sessionActionLoading === 'revoke_all_other' ? 'Revoking...' : 'Revoke Every Device'}
                  </button>
                </div>

                {tokensError ? <p className={style.sessionError}>{tokensError}</p> : null}

                {sessionTokens.length === 0 && !tokensLoading ? (
                  <p className={style.sessionEmpty}>No active session tokens found.</p>
                ) : (
                  <div className={style.sessionTokenList}>
                    {sessionTokens.map((token) => (
                      <div key={token.tokenId} className={style.sessionTokenItem}>
                        <div className={style.sessionTokenMeta}>
                          <div className={style.sessionTokenTitle}>{token.label || 'Web Session'}</div>
                          <div className={style.sessionTokenDetails}>
                            <span>{token.platform || 'unknown'}</span>
                            <span>•</span>
                            <span>{token.ipAddress || 'unknown ip'}</span>
                            <span>•</span>
                            <span>Last used: {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'n/a'}</span>
                            {token.tokenId === user?.tid ? (
                              <>
                                <span>•</span>
                                <span>This Device</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <button
                          className={style.dangerButton}
                          onClick={() => handleRevokeToken(token.tokenId)}
                          disabled={revokingTokenId === token.tokenId}
                        >
                          {revokingTokenId === token.tokenId ? 'Revoking...' : 'Revoke'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </SettingCard>
            )}

            {activeSection === "view" && (
              <>
                {!isMobile && (
                  <SettingCard
                    title="Default View"
                    description="Choose your preferred view for file lists"
                  >
                    <div className={style.optionGrid}>
                      {viewOptions.map(option => (
                        <OptionButton
                          key={option.value}
                          option={option}
                          selected={defaultView}
                          onChange={setDefaultView}
                        />
                      ))}
                    </div>
                  </SettingCard>
                )}

                <SettingCard
                  title="Default Sort"
                  description="Choose how files are sorted by default"
                >
                  <div className={style.optionList}>
                    {sortOptions.map(option => (
                      <OptionButton
                        key={option.value}
                        option={option}
                        selected={defaultSort}
                        onChange={setDefaultSort}
                      />
                    ))}
                  </div>
                </SettingCard>
              </>
            )}

            {activeSection === "performance" && (
              <>
                <SettingCard
                  title="Image Quality"
                  description="Quality for viewing images in the file viewer"
                >
                  <div className={style.optionList}>
                    {qualityOptions.map(option => (
                      <OptionButton
                        key={option.value}
                        option={option}
                        selected={imageQuality}
                        onChange={setImageQuality}
                      />
                    ))}
                  </div>
                </SettingCard>

                <SettingCard
                  title="Upload Quality"
                  description="Quality for uploaded files (affects file size)"
                >
                  <div className={style.optionList}>
                    {qualityOptions.map(option => (
                      <OptionButton
                        key={option.value}
                        option={option}
                        selected={uploadQuality}
                        onChange={setUploadQuality}
                      />
                    ))}
                  </div>
                </SettingCard>

                <SettingCard
                  title="Thumbnail Resolution"
                  description="Resolution for thumbnail previews (affects loading speed)"
                >
                  <div className={style.optionList}>
                    {thumbnailResolutionOptions.map(option => (
                      <OptionButton
                        key={option.value}
                        option={option}
                        selected={thumbnailResolution}
                        onChange={setThumbnailResolution}
                      />
                    ))}
                  </div>
                </SettingCard>
              </>
            )}

            {activeSection === "danger" && (
              <div className={style.dangerCard}>
                <SettingCard
                  title="Export Data"
                  description="Download a copy of all your files and database entries"
                >
                  <button
                    className={style.secondaryButton}
                    onClick={() => setShowExportModal(true)}
                  >
                    Download My Data
                  </button>
                </SettingCard>

                <SettingCard
                  title="Delete Account"
                  description="Disable your account for 30 days, then permanently delete all data"
                >
                  <button
                    className={style.dangerButton}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={18} />
                    Delete My Account
                  </button>
                </SettingCard>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Account"
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletePassword("");
        }}
        onConfirm={handleDeleteAccount}
        confirmText={isDeleting ? "Deleting..." : "Disable Account"}
        isDestructive={true}
        isLoading={isDeleting}
      >
        <div className={style.deleteForm}>
          <p className={style.warningText}>
            ⚠️ Your account will be disabled for 30 days. After that, all your data will be permanently deleted. You can cancel the deletion anytime within those 30 days.
          </p>

          <p className={style.infoText}>
            An email will be sent to {user?.email} with instructions on how to cancel the deletion.
          </p>

          <div className={style.formGroup}>
            <label htmlFor="delete-password">Enter your password to confirm:</label>
            <input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              className={style.formInput}
              disabled={isDeleting}
            />
          </div>
        </div>
      </ConfirmModal>

      {/* Export Data Modal */}
      {showExportModal && (
        <div className={style.modalOverlay}>
          <div className={style.modal}>
            <div className={style.modalHeader}>
              <h2>Export Your Data</h2>
              <button
                className={style.closeButton}
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                <X size={24} />
              </button>
            </div>

            <div className={style.modalBody}>
              <p>Select what data you would like to export:</p>

              <div className={style.exportOptions}>
                <label className={style.exportOption}>
                  <input
                    type="radio"
                    value="files"
                    checked={exportType === 'files'}
                    onChange={(e) => setExportType(e.target.value)}
                    disabled={isExporting}
                  />
                  <span>
                    <strong>All Cloud Stored Files</strong>
                    <small>All your files and folders from cloud storage</small>
                  </span>
                </label>

                <label className={style.exportOption}>
                  <input
                    type="radio"
                    value="database"
                    checked={exportType === 'database'}
                    onChange={(e) => setExportType(e.target.value)}
                    disabled={isExporting}
                  />
                  <span>
                    <strong>Database Entries</strong>
                    <small>User info, settings, and metadata (password removed for security)</small>
                  </span>
                </label>

                <label className={style.exportOption}>
                  <input
                    type="radio"
                    value="both"
                    checked={exportType === 'both'}
                    onChange={(e) => setExportType(e.target.value)}
                    disabled={isExporting}
                  />
                  <span>
                    <strong>Everything</strong>
                    <small>All files and database entries combined</small>
                  </span>
                </label>
              </div>
            </div>

            <div className={style.modalFooter}>
              <button
                className={style.secondaryButton}
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                className={style.primaryButton}
                onClick={handleExportData}
                disabled={isExporting}
              >
                {isExporting ? "Exporting..." : "Download Export"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
