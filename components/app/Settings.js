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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Upload,
  ChevronDown,
  ChevronUp,
  Trash2,
  Laptop,
  Square,
  SquareDot,
  Grid3x3
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import ConfirmModal from "./ConfirmModal";
import { api } from "@/utils/api";
import style from "./Settings.module.css";
import SoftLoading from "../SoftLoading";

export default function Settings({ onClose, onViewModeChange, onSortByChange, onThemeChange, isMobile = false }) {
  const { user, signout } = useAuth();

  const [theme, setTheme] = useState("device");
  const [defaultView, setDefaultView] = useState("details");
  const [defaultSort, setDefaultSort] = useState("name");
  const [imageQuality, setImageQuality] = useState("best");
  const [uploadQuality, setUploadQuality] = useState("best");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [dropdownStates, setDropdownStates] = useState({
    appearance: false,
    defaultView: false,
    defaultSort: false,
    imageQuality: false,
    uploadQuality: false
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const toggleDropdown = (key) => {
    setDropdownStates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const saveSettings = async (settingsToUpdate) => {
    try {
      const response = await api.post('/api/user/settings', settingsToUpdate);

      if (!response.success) {
        Object.entries(settingsToUpdate).forEach(([key, value]) => {
          localStorage.setItem(`cloud-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
        });
      }
    } catch (error) {
      Object.entries(settingsToUpdate).forEach(([key, value]) => {
        localStorage.setItem(`cloud-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      });
    }
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
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          const savedTheme = localStorage.getItem('cloud-theme') || 'device';
          const savedView = localStorage.getItem('cloud-default-view') || 'details';
          const savedSort = localStorage.getItem('cloud-default-sort') || 'name';
          const savedImageQuality = localStorage.getItem('cloud-image-quality') || 'best';
          const savedUploadQuality = localStorage.getItem('cloud-upload-quality') || 'best';

          setTheme(savedTheme);
          setDefaultView(savedView);
          setDefaultSort(savedSort);
          setImageQuality(savedImageQuality);
          setUploadQuality(savedUploadQuality);
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
    if (typeof window !== 'undefined' && settingsLoaded) {
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

      saveSettings({ theme });

      if (onThemeChange) {
        onThemeChange(theme);
      }
    }
  }, [theme, settingsLoaded, onThemeChange]);

  useEffect(() => {
    if (settingsLoaded && !isMobile) {
      saveSettings({ defaultView });
      if (onViewModeChange) {
        onViewModeChange(defaultView);
      }
    }
  }, [defaultView, onViewModeChange, settingsLoaded, isMobile]);

  useEffect(() => {
    if (settingsLoaded) {
      saveSettings({ defaultSort });
      if (onSortByChange) {
        onSortByChange(defaultSort);
      }
    }
  }, [defaultSort, onSortByChange, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) {
      saveSettings({ imageQuality });
    }
  }, [imageQuality, settingsLoaded]);

  useEffect(() => {
    if (settingsLoaded) {
      saveSettings({ uploadQuality });
    }
  }, [uploadQuality, settingsLoaded]);

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
    { value: "light", label: "Light", icon: <Sun size={20} /> },
    { value: "dark", label: "Dark", icon: <Moon size={20} /> },
    { value: "high-contrast", label: "High contrast", icon: <Contrast size={20} /> },
    { value: "device", label: "Device theme", icon: <Laptop size={20} /> }
  ];

  const viewOptions = [
    { value: "extraLargeIcons", label: "Extra Large Icons", icon: <ImageIcon size={20} /> },
    { value: "largeIcons", label: "Large Icons", icon: <Square size={20} /> },
    { value: "mediumIcons", label: "Medium Icons", icon: <SquareDot size={20} /> },
    { value: "smallIcons", label: "Small Icons", icon: <Grid3x3 size={20} /> },
    { value: "list", label: "List", icon: <List size={20} /> },
    { value: "details", label: "Details", icon: <BarChart3 size={20} /> },
    { value: "tiles", label: "Tiles", icon: <LayoutGrid size={20} /> }
  ];

  const sortOptions = [
    { value: "name", label: "Name", icon: <ArrowUpDown size={20} /> },
    { value: "date", label: "Date modified", icon: <ArrowUp size={20} /> },
    { value: "size", label: "Size", icon: <ArrowDown size={20} /> },
    { value: "type", label: "Type", icon: <ArrowUpDown size={20} /> }
  ];

  const qualityOptions = [
    { value: "best", label: "Best quality" },
    { value: "medium", label: "Medium quality" },
    { value: "low", label: "Low quality" }
  ];

  const DropdownSettingItem = ({ title, description, children, icon, dropdownKey, currentValue }) => (
    <div className={style.settingItem}>
      <div
        className={style.settingHeader}
        onClick={() => toggleDropdown(dropdownKey)}
      >
        <div className={style.settingIcon}>{icon}</div>
        <div className={style.settingText}>
          <h3 className={style.settingTitle}>{title}</h3>
          {description && <p className={style.settingDescription}>{description}</p>}
        </div>
        <div className={style.currentValue}>{currentValue}</div>
        <div className={style.chevron}>
          {dropdownStates[dropdownKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      {dropdownStates[dropdownKey] && (
        <div className={style.settingDropdown}>
          {children}
        </div>
      )}
    </div>
  );

  const RadioGroup = ({ options, value, onChange, name }) => (
    <div className={style.radioGroup}>
      {options.map((option) => (
        <label key={option.value} className={style.radioOption}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className={style.radioInput}
          />
          <div className={style.radioContent}>
            {option.icon && <div className={style.radioIcon}>{option.icon}</div>}
            <span className={style.radioLabel}>{option.label}</span>
          </div>
        </label>
      ))}
    </div>
  );

  const getCurrentValueLabel = (options, value) => {
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  if (!settingsLoaded || !user) return <SoftLoading />;

  return (
    <>
      <div className={style.settings}>
        <div className={style.header}>
          <h1 className={style.title}>Settings</h1>
        </div>

        <div className={style.content}>
          <div className={style.settingsContainer}>

            <DropdownSettingItem
              title="Appearance"
              description="Choose how Cloud looks"
              icon={<Monitor size={24} />}
              dropdownKey="appearance"
              currentValue={getCurrentValueLabel(themeOptions, theme)}
            >
              <RadioGroup
                options={themeOptions}
                value={theme}
                onChange={setTheme}
                name="theme"
              />
            </DropdownSettingItem>

            {!isMobile && (
              <DropdownSettingItem
                title="Default view"
                description="Choose your preferred view for file lists"
                icon={<LayoutGrid size={24} />}
                dropdownKey="defaultView"
                currentValue={getCurrentValueLabel(viewOptions, defaultView)}
              >
                <RadioGroup
                  options={viewOptions}
                  value={defaultView}
                  onChange={setDefaultView}
                  name="defaultView"
                />
              </DropdownSettingItem>
            )}

            <DropdownSettingItem
              title="Default sort"
              description="Choose how files are sorted by default"
              icon={<ArrowUpDown size={24} />}
              dropdownKey="defaultSort"
              currentValue={getCurrentValueLabel(sortOptions, defaultSort)}
            >
              <RadioGroup
                options={sortOptions}
                value={defaultSort}
                onChange={setDefaultSort}
                name="defaultSort"
              />
            </DropdownSettingItem>

            <DropdownSettingItem
              title="Image quality"
              description="Quality for viewing images"
              icon={<ImageIcon size={24} />}
              dropdownKey="imageQuality"
              currentValue={getCurrentValueLabel(qualityOptions, imageQuality)}
            >
              <RadioGroup
                options={qualityOptions}
                value={imageQuality}
                onChange={setImageQuality}
                name="imageQuality"
              />
            </DropdownSettingItem>

            <DropdownSettingItem
              title="Upload quality"
              description="Quality for uploaded files"
              icon={<Upload size={24} />}
              dropdownKey="uploadQuality"
              currentValue={getCurrentValueLabel(qualityOptions, uploadQuality)}
            >
              <RadioGroup
                options={qualityOptions}
                value={uploadQuality}
                onChange={setUploadQuality}
                name="uploadQuality"
              />
            </DropdownSettingItem>

            {/* Delete Account Section */}
            <div className={style.dangerZone}>
              <h2 className={style.dangerTitle}>Danger Zone</h2>
              <div className={style.settingItem}>
                <div className={style.settingHeader} onClick={() => setShowDeleteConfirm(true)}>
                  <div className={style.settingIcon}>
                    <Trash2 size={24} />
                  </div>
                  <div className={style.settingText}>
                    <h3 className={style.settingTitle}>Delete Account</h3>
                    <p className={style.settingDescription}>Permanently delete your account and all data</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
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