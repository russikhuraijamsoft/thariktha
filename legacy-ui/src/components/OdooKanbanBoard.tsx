import React from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Calendar, IndianRupee, ArrowRight, ArrowLeft, 
  User, CheckCircle2, AlertTriangle, Clock, Eye
} from 'lucide-react';

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
}

export interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  amount?: number;
  stageId: string;
  date?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  rawItem: any;
}

interface OdooKanbanBoardProps {
  columns: KanbanColumn[];
  items: KanbanItem[];
  onItemClick: (item: KanbanItem) => void;
  onMoveStage?: (itemId: string, newStageId: string) => void;
  onQuickAdd?: (stageId: string) => void;
}

export const OdooKanbanBoard: React.FC<OdooKanbanBoardProps> = ({
  columns,
  items,
  onItemClick,
  onMoveStage,
  onQuickAdd
}) => {
  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map((col, colIdx) => {
          const colItems = items.filter(
            item => item.stageId.toLowerCase() === col.id.toLowerCase()
          );
          const colTotal = colItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

          return (
            <div
              key={col.id}
              className="w-72 sm:w-80 bg-[#171b22] border border-neutral-700/70 rounded-xl flex flex-col max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-neutral-700/60 flex items-center justify-between bg-[#14171d] rounded-t-xl">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color || 'bg-[#714B67]'}`}></span>
                  <h3 className="text-xs font-bold text-white tracking-tight uppercase">
                    {col.title}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                    {colItems.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {colTotal > 0 && (
                    <span className="text-[11px] font-mono font-semibold text-amber-400">
                      ₹{colTotal.toLocaleString()}
                    </span>
                  )}
                  {onQuickAdd && (
                    <button
                      onClick={() => onQuickAdd(col.id)}
                      className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
                      title="Quick add to stage"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Column Item List */}
              <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
                {colItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 italic">
                    No records in this stage
                  </div>
                ) : (
                  colItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onItemClick(item)}
                      className="bg-[#20252e] hover:bg-[#282f3a] border border-neutral-700/70 hover:border-[#714B67] rounded-lg p-3 text-xs shadow-xs transition-all cursor-pointer group select-none flex flex-col justify-between"
                    >
                      <div>
                        {/* Reference and priority */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                          <span className="font-mono text-purple-300 font-semibold group-hover:text-amber-400 transition-colors">
                            {item.id}
                          </span>
                          {item.priority === 'high' && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 rounded">
                              URGENT
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-white leading-snug">
                          {item.title}
                        </h4>

                        {/* Subtitle / Customer */}
                        {item.subtitle && (
                          <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                            {item.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Card Footer: Amount, Date & Quick Move */}
                      <div className="mt-3 pt-2 border-t border-neutral-700/40 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-mono">
                          {item.amount !== undefined && (
                            <span className="font-semibold text-amber-400">
                              ₹{item.amount.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {/* Stage shift arrows */}
                        {onMoveStage && (
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            {colIdx > 0 && (
                              <button
                                onClick={() => onMoveStage(item.id, columns[colIdx - 1].id)}
                                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition"
                                title="Move to previous stage"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {colIdx < columns.length - 1 && (
                              <button
                                onClick={() => onMoveStage(item.id, columns[colIdx + 1].id)}
                                className="p-1 rounded bg-[#714B67] hover:bg-[#86597a] text-white transition"
                                title="Advance to next stage"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
