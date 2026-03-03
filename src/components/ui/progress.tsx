import React from "react";

interface ProgressProps {
    value: number;
    className?: string;
}

export function Progress({ value, className = "" }: ProgressProps) {
    return (
        <div className={`w-full h-3 bg-gray-200 rounded overflow-hidden ${className}`}>
            <div
                className="h-full bg-green-500 rounded transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
            />
        </div>
    );
}
