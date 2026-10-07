import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Search, Filter, Layers, Download, Printer, 
  Grid, List, Kanban, BarChart3, ChevronLeft, ChevronRight,
  SlidersHorizontal, Check, ArrowUpDown, X, Sparkles, RefreshCw
} from 'lucide-react';

export type OdooViewMode = 'kanban' | 'list' | 'pivot' | 'form';

export interface OdooControlPanelProps {
  appName: string;
  breadcrumbs: string[];
  viewMode: OdooViewMode;
  onViewModeChange: (mode: OdooViewMode) => void;
  onNewRecord?: () => void;
  newRecordLabel?: string;
  onExport?: () => void;
  onPrint?: () => void;
  onRefresh?: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter?: string;
  onFilterChange?: (filterId: string) => void;
  availableFilters?: { id: string; label: string }[];
  activeGroupBy?: string;
  onGroupByChange?: (groupBy: string) => void;
  availableGroups?: { id: string; label: string }[];
  recordCount?: number;
  totalCount?: number;
}

export const OdooControlPanel: React.FC<OdooControlPanelProps> = ({
  appName,
  breadcrumbs,
  viewMode,
  onViewModeChange,
  onNewRecord,
  newRecordLabel = 'New',
  onExport,
  onPrint,
  onRefresh,
  searchQuery,
  onSearchChange,
  activeFilter = 'all',
  onFilterChange,
  availableFilters = [
    { id: 'all', label: 'All Records' },
    { id: 'draft', label: 'Draft' },
    { id: 'confirmed', label: 'Confirmed / Active' },
    { id: 'in_progress', label: 'In Progress' },
    { id: 'done', label: 'Completed' },
    { id: 'urgent', label: 'High Priority / Low Stock' }
  ],
  activeGroupBy = 'none',
  onGroupByChange,
  availableGroups = [
    { id: 'none', label: 'None' },
    { id: 'status', label: 'By Stage / Status' },
    { id: 'category', label: 'By Category' },
    { id: 'customer', label: 'By Customer / Club' },
    { id: 'branch', label: 'By Branch Location' }
  ],
  recordCount = 0,
  totalCount = 0
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-[#1a1f26] border border-neutral-800 rounded-xl px-4 py-3 mb-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-neutral-100 font-sans">
      
      {/* Left: Action Buttons & Breadcrumbs */}
      <div className="flex items-center gap-3 flex-wrap">
        {onNewRecord && (
          <button
            onClick={onNewRecord}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#714B67] hover:bg-[#86597a] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{newRecordLabel}</span>
          </button>
        )}

        {onExport && (
          <button
            onClick={onExport}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
            title="Export Records (CSV/Excel)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        )}

        {onPrint && (
          <button
            onClick={onPrint}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-medium border border-neutral-700/60 transition cursor-pointer"
            title="Print Summary"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg text-xs border border-neutral-700/60 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Breadcrumb Trail */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-neutral-400 ml-1">
          <span className="font-semibold text-neutral-300">{appName}</span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span className="text-neutral-600">/</span>
              <span className={idx === breadcrumbs.length - 1 ? 'text-amber-400 font-medium' : ''}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Center: Odoo Search & Filter Controls */}
      <div className="flex items-center gap-2 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${appName.toLowerCase()}...`}
            className="w-full bg-[#12161c] border border-neutral-700/80 rounded-lg pl-8.5 pr-7 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#714B67] focus:ring-1 focus:ring-[#714B67] transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters Dropdown */}
        {onFilterChange && (
          <div ref={filterRef} className="relative">
            <button
              onClick={() => {
                setIsFilterDropdownOpen(!isFilterDropdownOpen);
                setIsGroupDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                activeFilter !== 'all'
                  ? 'bg-[#714B67]/20 border-[#714B67] text-purple-200'
                  : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:text-white'
              }`}
              title="Filter Records"
            >
              <Filter className="w-3 h-3 text-purple-400" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilter !== 'all' && (
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
              )}
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute right-0 sm:left-0 mt-1.5 w-48 bg-[#1f242d] border border-neutral-700 rounded-xl shadow-xl p-1.5 z-40 text-xs">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800 mb-1">
                  Filter By Stage / State
                </div>
                {availableFilters.map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => {
                      onFilterChange(filter.id);
                      setIsFilterDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      activeFilter === filter.id
                        ? 'bg-[#714B67] text-white font-medium'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{filter.label}</span>
                    {activeFilter === filter.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Group By Dropdown */}
        {onGroupByChange && (
          <div ref={groupRef} className="relative">
            <button
              onClick={() => {
                setIsGroupDropdownOpen(!isGroupDropdownOpen);
                setIsFilterDropdownOpen(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                activeGroupBy !== 'none'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                  : 'bg-neutral-800/80 border-neutral-700/60 text-neutral-300 hover:text-white'
              }`}
              title="Group By Dimension"
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Group By</span>
              {activeGroupBy !== 'none' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>

            {isGroupDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-[#1f242d] border border-neutral-700 rounded-xl shadow-xl p-1.5 z-40 text-xs">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800 mb-1">
                  Group Aggregations
                </div>
                {availableGroups.map((grp) => (
                  <button
                    key={grp.id}
                    onClick={() => {
                      onGroupByChange(grp.id);
                      setIsGroupDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition ${
                      activeGroupBy === grp.id
                        ? 'bg-[#714B67] text-white font-medium'
                        : 'text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>{grp.label}</span>
                    {activeGroupBy === grp.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Odoo View Switchers & Pager */}
      <div className="flex items-center justify-between md:justify-end gap-3">
        {/* Record Count */}
        <div className="text-xs text-neutral-400 font-mono">
          <span>{recordCount}</span>
          {totalCount > recordCount && <span className="text-neutral-500"> / {totalCount}</span>}
          <span className="ml-1 text-[11px] text-neutral-500">records</span>
        </div>

        {/* View Switcher Icons (Kanban, List, Pivot) */}
        <div className="flex items-center bg-[#12161c] border border-neutral-700/80 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Kanban View (Pipeline Stages)"
          >
            <Kanban className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="List View (Tree Table)"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onViewModeChange('pivot')}
            className={`p-1.5 rounded-md transition cursor-pointer ${
              viewMode === 'pivot'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
            title="Pivot / Analytics View"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </div>
  );
};
