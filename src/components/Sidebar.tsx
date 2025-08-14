// src/components/Sidebar.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { SidebarProps, TreeNode } from '../types/FileTypes';
import SearchBar from './SearchBar';
import TreeItem from './TreeItem';
import TaskTypeSelector from './TaskTypeSelector';
import {
  ListChecks,
  ListX,
  FolderMinus,
  FolderPlus,
  ClipboardPaste,
  Save,
  Trash2,
  Download,
} from 'lucide-react';
import { normalizePath, join, isSubPath } from '../utils/pathUtils';

const Sidebar = ({
  selectedFolder,
  allFiles,
  selectedFiles,
  toggleFileSelection,
  toggleFolderSelection,
  searchTerm,
  onSearchChange,
  selectAllFiles,
  deselectAllFiles,
  expandedNodes,
  toggleExpanded,
  includeBinaryPaths,
  selectedTaskType,
  onTaskTypeChange,
  onManageCustomTypes,
  collapseAllFolders,
  expandAllFolders,
  onOpenPasteToSelectModal,
  workspaces,
  currentWorkspaceId,
  onSaveSelection,
  onLoadSelectionSet,
  onDeleteSelectionSet,
}: SidebarProps) => {
  const [fileTree, setFileTree] = useState(() => [] as TreeNode[]);
  const [isTreeBuildingComplete, setIsTreeBuildingComplete] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);

  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 500;

  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === currentWorkspaceId);
  }, [workspaces, currentWorkspaceId]);

  const handleResizeStart = useCallback((e: any) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    let animationFrameId: number;

    const handleResize = (e: MouseEvent) => {
      if (!isResizing) return;

      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(e.clientX, MAX_SIDEBAR_WIDTH));
        setSidebarWidth(newWidth);
      });
    };

    const handleResizeEnd = () => {
      cancelAnimationFrame(animationFrameId);
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleResize, { passive: true });
    document.addEventListener('mouseup', handleResizeEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing]);

  useEffect(() => {
    if (allFiles.length === 0) {
      setFileTree([]);
      setIsTreeBuildingComplete(false);
      return;
    }

    const buildTree = () => {
      console.log('Building file tree from', allFiles.length, 'files');
      setIsTreeBuildingComplete(false);

      try {
        const fileMap: Record<string, any> = {};

        allFiles.forEach((file) => {
          if (!file.path) return;

          const normalizedSelectedFolder = selectedFolder ? normalizePath(selectedFolder) : '';
          const normalizedFilePath = normalizePath(file.path);

          const relativePath =
            normalizedSelectedFolder && isSubPath(normalizedSelectedFolder, normalizedFilePath)
              ? normalizedFilePath.substring(normalizedSelectedFolder.length + 1)
              : normalizedFilePath;

          const parts = relativePath.split('/');
          let currentPath = '';
          let current = fileMap;

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (!part) continue;

            currentPath = currentPath ? join(currentPath, part) : part;

            const fullPath = normalizedSelectedFolder
              ? join(normalizedSelectedFolder, currentPath)
              : currentPath;

            if (i === parts.length - 1) {
              current[part] = {
                id: `node-${file.path}`,
                name: part,
                path: file.path,
                type: 'file',
                level: i,
                fileData: file,
              };
            } else {
              if (!current[part]) {
                current[part] = {
                  id: `node-${fullPath}`,
                  name: part,
                  path: fullPath,
                  type: 'directory',
                  level: i,
                  children: {},
                };
              }
              current = current[part].children;
            }
          }
        });

        const hasBinaryFiles = (files: TreeNode[]): boolean => {
          return files.some((node) => {
            if (node.type === 'file') {
              return node.fileData?.isBinary || false;
            }
            return node.children ? hasBinaryFiles(node.children) : false;
          });
        };

        const convertToTreeNodes = (node: Record<string, any>, level = 0): TreeNode[] => {
          return Object.keys(node).map((key) => {
            const item = node[key];
            if (item.type === 'file') {
              return item as TreeNode;
            } else {
              const children = convertToTreeNodes(item.children, level + 1);
              const isExpanded =
                expandedNodes[item.id] !== undefined ? expandedNodes[item.id] : true;

              const hasBinaries = hasBinaryFiles(children);

              return {
                ...item,
                children: children.sort((a, b) => {
                  if (a.type === 'directory' && b.type === 'file') return -1;
                  if (a.type === 'file' && b.type === 'directory') return 1;
                  if (a.type === 'file' && b.type === 'file') {
                    const aTokens = a.fileData?.tokenCount || 0;
                    const bTokens = b.fileData?.tokenCount || 0;
                    return bTokens - aTokens;
                  }
                  return a.name.localeCompare(b.name);
                }),
                isExpanded,
                hasBinaries,
              };
            }
          });
        };

        const treeRoots = convertToTreeNodes(fileMap);
        const sortedTree = treeRoots.sort((a, b) => {
          if (a.type === 'directory' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'directory') return 1;

          if (a.type === 'file' && b.type === 'file') {
            const aTokens = a.fileData?.tokenCount || 0;
            const bTokens = b.fileData?.tokenCount || 0;
            return bTokens - aTokens;
          }

          return a.name.localeCompare(b.name);
        });

        setFileTree(sortedTree);
        setIsTreeBuildingComplete(true);
      } catch (err) {
        console.error('Error building file tree:', err);
        setFileTree([]);
        setIsTreeBuildingComplete(true);
      }
    };

    const buildTreeTimeoutId = setTimeout(buildTree, 0);
    return () => clearTimeout(buildTreeTimeoutId);
  }, [allFiles, selectedFolder, expandedNodes]);

  useEffect(() => {
    if (fileTree.length === 0) return;

    const applyExpandedState = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map((node: TreeNode): TreeNode => {
        if (node.type === 'directory') {
          const isExpanded = expandedNodes[node.id] !== undefined ? expandedNodes[node.id] : true;

          return {
            ...node,
            isExpanded,
            children: node.children ? applyExpandedState(node.children) : [],
          };
        }
        return node;
      });
    };

    setFileTree((prevTree: TreeNode[]) => applyExpandedState(prevTree));
  }, [expandedNodes, fileTree.length]);

  const flattenTree = useCallback((nodes: TreeNode[]): TreeNode[] => {
    let result: TreeNode[] = [];

    nodes.forEach((node) => {
      result.push(node);

      if (node.type === 'directory' && node.isExpanded && node.children) {
        result = [...result, ...flattenTree(node.children)];
      }
    });

    return result;
  }, []);

  const filterTree = useCallback((nodes: TreeNode[], term: string): TreeNode[] => {
    if (!term) return nodes;

    const lowerTerm = term.toLowerCase();

    const nodeMatches = (node: TreeNode): boolean => {
      if (node.name.toLowerCase().includes(lowerTerm)) return true;

      if (node.type === 'file') return false;

      if (node.children) {
        return node.children.some(nodeMatches);
      }

      return false;
    };

    return nodes.filter(nodeMatches).map((node) => {
      if (node.type === 'directory' && node.children) {
        return {
          ...node,
          children: filterTree(node.children, term),
          isExpanded: true,
        };
      }
      return node;
    });
  }, []);

  const filteredTree = useMemo(
    () => filterTree(fileTree, searchTerm),
    [fileTree, searchTerm, filterTree]
  );

  const visibleTree = useMemo(() => flattenTree(filteredTree), [filteredTree, flattenTree]);

  const renderedTreeItems = useMemo(() => {
    if (visibleTree.length === 0) {
      return <div className="tree-empty">No files match your search.</div>;
    }

    return visibleTree.map((node: TreeNode) => (
      <TreeItem
        key={node.id}
        node={node}
        selectedFiles={selectedFiles}
        toggleFileSelection={toggleFileSelection}
        toggleFolderSelection={toggleFolderSelection}
        toggleExpanded={toggleExpanded}
        includeBinaryPaths={includeBinaryPaths}
      />
    ));
  }, [
    visibleTree,
    selectedFiles,
    toggleFileSelection,
    toggleFolderSelection,
    toggleExpanded,
    includeBinaryPaths,
  ]);

  return (
    <div className="sidebar" style={{ width: `${sidebarWidth}px` }}>
      {onTaskTypeChange && (
        <TaskTypeSelector
          selectedTaskType={selectedTaskType || ''}
          onTaskTypeChange={onTaskTypeChange}
          onManageCustomTypes={onManageCustomTypes}
        />
      )}

      <div className="sidebar-header">
        <div className="sidebar-title">Multiple Selection List</div>
        <button
          className="sidebar-action-btn"
          title="Save current selection"
          onClick={onSaveSelection}
          disabled={!currentWorkspace || selectedFiles.length === 0}
        >
          <Save size={18} />
        </button>
      </div>

      <div className="selection-set-list">
        {currentWorkspace &&
        currentWorkspace.selectionSets &&
        currentWorkspace.selectionSets.length > 0 ? (
          currentWorkspace.selectionSets.map((set) => (
            <div key={set.id} className="selection-set-item">
              <span className="selection-set-name">{set.name}</span>
              <div className="selection-set-actions">
                <button title="Load selection" onClick={() => onLoadSelectionSet(set.filePaths)}>
                  <Download size={16} />
                </button>
                <button title="Delete selection" onClick={() => onDeleteSelectionSet(set.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="selection-set-empty">No saved selections.</div>
        )}
      </div>

      <div className="sidebar-header">
        <div className="sidebar-title">Files</div>
      </div>

      <div className="sidebar-search">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={onSearchChange}
          placeholder="Search files..."
        />
      </div>

      <div className="sidebar-actions">
        <button
          className="sidebar-action-btn"
          title="Select all files and folders"
          onClick={selectAllFiles}
          aria-label="Select all files and folders"
          type="button"
        >
          <ListChecks size={18} />
        </button>
        <button
          className="sidebar-action-btn"
          title="Deselect all files and folders"
          onClick={deselectAllFiles}
          aria-label="Deselect all files and folders"
          type="button"
        >
          <ListX size={18} />
        </button>
        <button
          className="sidebar-action-btn"
          title="Collapse all folders"
          onClick={collapseAllFolders}
          aria-label="Collapse all folders"
          type="button"
        >
          <FolderMinus size={18} />
        </button>
        <button
          className="sidebar-action-btn"
          title="Expand all folders"
          onClick={expandAllFolders}
          aria-label="Expand all folders"
          type="button"
        >
          <FolderPlus size={18} />
        </button>
        <button
          className="sidebar-action-btn"
          title="Select files from pasted list"
          onClick={onOpenPasteToSelectModal}
          aria-label="Select files from pasted list"
          type="button"
        >
          <ClipboardPaste size={18} />
        </button>
      </div>

      {allFiles.length > 0 ? (
        isTreeBuildingComplete ? (
          <div className="file-tree">{renderedTreeItems}</div>
        ) : (
          <div className="tree-loading">
            <div className="spinner"></div>
            <span>Building file tree...</span>
          </div>
        )
      ) : (
        <div className="tree-empty">No files found in this folder.</div>
      )}

      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize sidebar"
      ></div>
    </div>
  );
};

export default Sidebar;
  