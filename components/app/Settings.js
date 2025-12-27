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
  User as UserIcon
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import ConfirmModal from "./ConfirmModal";
import { api } from "@/utils/api";
import style from "./Settings.module.css";
import SoftLoading from "../SoftLoading";
import gravatar from "gravatar";

export default function Settings({ onClose, onViewModeChange, onSortByChange, onThemeChange, isMobile = false }) {
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

  const [activeSection, setActiveSection] = useState("appearance");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const [initialSettings, setInitialSettings] = useState(null);

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

  const handleDeleteAccount = async () => {
    if (deleteEmail !== user.email) {
      alert("Email doesn't match your account email.");
      return;
    }

    if (!deletePassword.trim()) {
      alert("Please enter your password.");
      return;
    }

    setIsDeleting(true);
    try {
      const response = await api.post('/api/user/delete', JSON.stringify({
        email: deleteEmail,
        password: deletePassword
      }));

      if (response.success) {
        await signout();
      } else {
        alert(response.message || "Failed to delete account. Please check your credentials.");
      }
    } catch (error) {
      alert("An error occurred while deleting your account. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteEmail("");
      setDeletePassword("");
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
                  title="Delete Account"
                  description="Permanently delete your account and all data"
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
          setDeleteEmail("");
          setDeletePassword("");
        }}
        onConfirm={handleDeleteAccount}
        confirmText={isDeleting ? "Deleting..." : "Delete Account"}
        isDestructive={true}
        isLoading={isDeleting}
      >
        <div className={style.deleteForm}>
          <p className={style.warningText}>
            ⚠️ This action cannot be undone. This will permanently delete your account and remove all your photos, videos, folders, and any memories saved on the disk.
          </p>

          <div className={style.formGroup}>
            <label htmlFor="delete-email">Enter your email address to confirm:</label>
            <input
              id="delete-email"
              type="email"
              value={deleteEmail}
              onChange={(e) => setDeleteEmail(e.target.value)}
              placeholder={user?.email}
              className={style.formInput}
              disabled={isDeleting}
            />
          </div>

          <div className={style.formGroup}>
            <label htmlFor="delete-password">Enter your password:</label>
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
    </>
  );
}
