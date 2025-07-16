import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { api } from '@/utils/api';
import styles from './CodeEditor.module.css';

export function CodeEditor({
    file,
    content,
    onSave,
    onClose,
    readOnly = false
}) {
    const [editorContent, setEditorContent] = useState(content);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [isMarkdown, setIsMarkdown] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [markdownHtml, setMarkdownHtml] = useState('');
    const editorRef = useRef(null);

    useEffect(() => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        setIsMarkdown(ext === 'md' || ext === 'markdown');
        document.body.style.overflow = 'hidden';
        document.body.style.paddingTop = '0';

        return () => {
            document.body.style.overflow = '';
            document.body.style.paddingTop = 'var(--top-nav-height)';
        };
    }, [file.name]);

    useEffect(() => {
        if (isMarkdown && showPreview) {
            renderMarkdown(editorContent);
        }
    }, [editorContent, isMarkdown, showPreview]);

    const getLanguage = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const languageMap = {
            'js': 'javascript',
            'jsx': 'javascript',
            'ts': 'typescript',
            'tsx': 'typescript',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'scss',
            'less': 'less',
            'py': 'python',
            'java': 'java',
            'c': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'cxx': 'cpp',
            'h': 'c',
            'hpp': 'cpp',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sql': 'sql',
            'sh': 'shell',
            'bash': 'shell',
            'zsh': 'shell',
            'fish': 'shell',
            'ps1': 'powershell',
            'psm1': 'powershell',
            'yml': 'yaml',
            'yaml': 'yaml',
            'json': 'json',
            'xml': 'xml',
            'md': 'markdown',
            'markdown': 'markdown',
            'txt': 'plaintext',
            'log': 'plaintext',
            'ini': 'ini',
            'conf': 'ini',
            'config': 'ini',
            'dockerfile': 'dockerfile',
            'r': 'r',
            'R': 'r',
            'dart': 'dart',
            'lua': 'lua',
            'perl': 'perl',
            'pl': 'perl',
            'vim': 'vim',
            'coffee': 'coffeescript',
            'proto': 'protobuf',
            'graphql': 'graphql',
            'gql': 'graphql',
            'handlebars': 'handlebars',
            'hbs': 'handlebars',
            'mustache': 'handlebars',
            'pug': 'pug',
            'jade': 'pug',
            'stylus': 'stylus',
            'styl': 'stylus',
            'clj': 'clojure',
            'cljs': 'clojure',
            'fs': 'fsharp',
            'fsx': 'fsharp',
            'ml': 'ocaml',
            'mli': 'ocaml',
            'pas': 'pascal',
            'pp': 'pascal',
            'asm': 'asm',
            's': 'asm',
            'bat': 'batch',
            'cmd': 'batch',
            'makefile': 'makefile',
            'mk': 'makefile',
            'cmake': 'cmake'
        };
        return languageMap[ext] || 'plaintext';
    };

    const renderMarkdown = async (markdownText) => {
        try {
            let html = markdownText
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^\* (.*$)/gim, '<li>$1</li>')
                .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`(.*?)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');

            setMarkdownHtml(html);
        } catch (error) {
            console.error('Error rendering markdown:', error);
            setMarkdownHtml('<p>Error rendering markdown</p>');
        }
    };

    const handleEditorChange = (value) => {
        setEditorContent(value);
        setHasChanges(value !== content);
    };

    const handleSave = async () => {
        if (!hasChanges || saving) return;

        setSaving(true);
        try {
            const response = await api.post('/api/files/edit', {
                path: file.path,
                content: editorContent
            });

            if (response.success) {
                setHasChanges(false);
                onSave?.(editorContent);
            } else {
                alert('Failed to save file: ' + response.message);
            }
        } catch (error) {
            console.error('Error saving file:', error);
            alert('Error saving file');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            if (hasChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                    onClose();
                }
            } else {
                onClose();
            }
        }
    };

    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6a9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'f97583' },
                { token: 'string', foreground: '9ecbff' },
                { token: 'number', foreground: '79b8ff' },
                { token: 'regexp', foreground: 'dbedff' },
                { token: 'operator', foreground: 'f97583' },
                { token: 'namespace', foreground: 'b392f0' },
                { token: 'type', foreground: 'b392f0' },
                { token: 'struct', foreground: 'b392f0' },
                { token: 'class', foreground: 'b392f0' },
                { token: 'interface', foreground: 'b392f0' },
                { token: 'parameter', foreground: 'ffab70' },
                { token: 'variable', foreground: 'e1e4e8' },
                { token: 'function', foreground: 'b392f0' },
                { token: 'member', foreground: '79b8ff' },
                { token: 'tag', foreground: '85e89d' },
                { token: 'attribute.name', foreground: 'fdaeb7' },
                { token: 'attribute.value', foreground: '9ecbff' },
                { token: 'delimiter.html', foreground: 'e1e4e8' },
                { token: 'delimiter.xml', foreground: 'e1e4e8' }
            ],
            colors: {
                'editor.background': '#161616',
                'editor.foreground': '#ecedef',
                'editorLineNumber.foreground': '#606060',
                'editorLineNumber.activeForeground': '#ecedef',
                'editor.selectionBackground': '#3c3c3c',
                'editor.selectionHighlightBackground': '#3c3c3c40',
                'editorCursor.foreground': '#ecedef',
                'editor.findMatchBackground': '#ffd33d44',
                'editor.findMatchHighlightBackground': '#ffd33d22',
                'editorIndentGuide.background': '#575757',
                'editorIndentGuide.activeBackground': '#888888',
                'editorBracketMatch.background': '#3c3c3c40',
                'editorBracketMatch.border': '#888888'
            }
        });

        monaco.editor.defineTheme('custom-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000', fontStyle: 'italic' },
                { token: 'keyword', foreground: '0000ff' },
                { token: 'string', foreground: 'a31515' },
                { token: 'number', foreground: '098658' },
                { token: 'regexp', foreground: 'd16969' },
                { token: 'operator', foreground: '000000' },
                { token: 'namespace', foreground: '795e26' },
                { token: 'type', foreground: '267f99' },
                { token: 'struct', foreground: '267f99' },
                { token: 'class', foreground: '267f99' },
                { token: 'interface', foreground: '267f99' },
                { token: 'parameter', foreground: '001080' },
                { token: 'variable', foreground: '001080' },
                { token: 'function', foreground: '795e26' },
                { token: 'member', foreground: '0070c1' },
                { token: 'tag', foreground: '800000' },
                { token: 'attribute.name', foreground: 'ff0000' },
                { token: 'attribute.value', foreground: '0451a5' },
                { token: 'delimiter.html', foreground: '383838' },
                { token: 'delimiter.xml', foreground: '383838' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#181818',
                'editorLineNumber.foreground': '#ADADAD',
                'editorLineNumber.activeForeground': '#181818',
                'editor.selectionBackground': '#c7c7c7',
                'editor.selectionHighlightBackground': '#c7c7c740',
                'editorCursor.foreground': '#181818',
                'editor.findMatchBackground': '#ffd33d44',
                'editor.findMatchHighlightBackground': '#ffd33d22',
                'editorIndentGuide.background': '#CFCFCF',
                'editorIndentGuide.activeBackground': '#606060',
                'editorBracketMatch.background': '#c7c7c740',
                'editorBracketMatch.border': '#606060'
            }
        });
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const setTheme = () => {
            const theme = mediaQuery.matches ? 'custom-dark' : 'custom-light';
            monaco.editor.setTheme(theme);
        };
        setTheme();
        mediaQuery.addEventListener('change', setTheme);
        editor.updateOptions({
            fontSize: 14,
            fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Monaco, Consolas, "Courier New", monospace',
            fontLigatures: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            lineNumbers: 'on',
            folding: true,
            bracketMatching: 'always',
            formatOnPaste: true,
            formatOnType: true,
            renderWhitespace: 'selection',
            renderControlCharacters: false,
            dragAndDrop: true,
            links: true,
            colorDecorators: true,
            contextmenu: true,
            mouseWheelZoom: true,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true,
            renderLineHighlight: 'gutter',
            highlightActiveIndentGuide: true,
            showFoldingControls: 'always',
            matchBrackets: 'always',
            occurrencesHighlight: true,
            selectionHighlight: true,
            wordHighlight: true,
            codeLens: true,
            suggest: {
                showKeywords: true,
                showSnippets: true,
                showClasses: true,
                showFunctions: true,
                showVariables: true
            }
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, handleSave);
        editor.addCommand(monaco.KeyCode.Escape, () => {
            if (hasChanges) {
                if (confirm('You have unsaved changes. Are you sure you want to close?')) {
                    onClose();
                }
            } else {
                onClose();
            }
        });
        return () => {
            mediaQuery.removeEventListener('change', setTheme);
        };
    };

    return (
        <div className={styles.codeEditorOverlay} onKeyDown={handleKeyDown}>
            <div className={styles.codeEditorContainer}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.fileInfo}>
                        <div className={styles.fileName}>
                            <span className={styles.fileIcon}>
                                {getLanguage(file.name) === 'markdown' ? '📝' : '💻'}
                            </span>
                            {file.name}
                            {hasChanges && <span className={styles.unsavedIndicator}>●</span>}
                        </div>
                        <div className={styles.filePath}>{file.path}</div>
                    </div>

                    <div className={styles.headerControls}>
                        {isMarkdown && (
                            <div className={styles.markdownControls}>
                                <button
                                    className={`${styles.tabButton} ${!showPreview ? styles.active : ''}`}
                                    onClick={() => setShowPreview(false)}
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    className={`${styles.tabButton} ${showPreview ? styles.active : ''}`}
                                    onClick={() => setShowPreview(true)}
                                >
                                    👁️ Preview
                                </button>
                            </div>
                        )}

                        {!readOnly && (
                            <button
                                className={`${styles.saveButton} ${hasChanges ? styles.hasChanges : ''}`}
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                                title="Save (Ctrl+S)"
                            >
                                {saving ? '⏳' : '💾'} Save
                            </button>
                        )}

                        <button
                            className={styles.closeButton}
                            onClick={onClose}
                            title="Close (Esc)"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className={styles.editorContent}>
                    {isMarkdown && showPreview ? (
                        <div className={styles.markdownPreview}>
                            <div
                                className={styles.markdownContent}
                                dangerouslySetInnerHTML={{ __html: markdownHtml }}
                            />
                        </div>
                    ) : (
                        <Editor
                            height="100%"
                            language={getLanguage(file.name)}
                            value={editorContent}
                            onChange={handleEditorChange}
                            onMount={handleEditorMount}
                            theme="custom-dark" // This will be overridden by the theme detection
                            options={{
                                readOnly: readOnly,
                                selectOnLineNumbers: true,
                                roundedSelection: false,
                                cursorStyle: 'line',
                                automaticLayout: true,
                                scrollbar: {
                                    vertical: 'visible',
                                    horizontal: 'visible',
                                    useShadows: false,
                                    verticalHasArrows: false,
                                    horizontalHasArrows: false,
                                    verticalScrollbarSize: 10,
                                    horizontalScrollbarSize: 10
                                }
                            }}
                        />
                    )}
                </div>

                {/* Status Bar */}
                <div className={styles.statusBar}>
                    <div className={styles.statusLeft}>
                        <span className={styles.language}>{getLanguage(file.name)}</span>
                        <span className={styles.encoding}>UTF-8</span>
                    </div>
                    <div className={styles.statusRight}>
                        {hasChanges && (
                            <span className={styles.statusMessage}>
                                Unsaved changes • Press Ctrl+S to save
                            </span>
                        )}
                        {saving && (
                            <span className={styles.statusMessage}>Saving...</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
