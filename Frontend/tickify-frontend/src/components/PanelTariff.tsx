import React from 'react';
import "@fontsource-variable/manrope";

export interface PanelProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional action area on the right of the header (e.g. a button) */
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ title, description, action, children, className }) => {
  return (
  <div className={`tt-panel border border-gray-200 rounded-lg p-4 ${className || ''}`.trim()}>
      <div className="tt-panel-header flex items-center justify-between">
        <div className="tt-panel-title-desc">
          <h2 className="tt-panel-title text-lg font-bold">{title}</h2>
          {description && <div className="tt-panel-description">{description}</div>}
        </div>
  {action && <div className="tt-panel-action flex-shrink-0">{action}</div>}
      </div>

      <div className="tt-panel-content">{children}</div>
    </div>
  );
};

export default Panel;
