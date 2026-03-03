"use client";
import { useRef, useState } from "react";

interface Props {
    onFilesSelected: (files: File[]) => void;
    maxSizeMB?: number;
    accept?: string;
    multiple?: boolean;
}

export function FileUpload({ onFilesSelected, maxSizeMB = 10, accept, multiple = true }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFiles = (fileList: FileList | null) => {
        if (!fileList) return;
        setError(null);
        const maxBytes = maxSizeMB * 1024 * 1024;
        const validFiles: File[] = [];
        for (const f of Array.from(fileList)) {
            if (f.size > maxBytes) { setError(`${f.name} exceeds ${maxSizeMB}MB limit`); continue; }
            validFiles.push(f);
        }
        const newFiles = multiple ? [...files, ...validFiles] : validFiles.slice(0, 1);
        setFiles(newFiles);
        onFilesSelected(newFiles);
    };

    const removeFile = (idx: number) => {
        const newFiles = files.filter((_, i) => i !== idx);
        setFiles(newFiles);
        onFilesSelected(newFiles);
    };

    return (
        <div className="space-y-2">
            <div
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? "border-blue-400 bg-blue-50 dark:bg-blue-950" : "border-gray-300 hover:border-gray-400"}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            >
                <div className="text-sm text-muted-foreground">
                    📎 Drop files here or <span className="text-primary underline">browse</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Max {maxSizeMB}MB per file</div>
                <input ref={inputRef} type="file" className="hidden" accept={accept} multiple={multiple}
                    onChange={(e) => handleFiles(e.target.files)} />
            </div>
            {error && <div className="text-xs text-red-500">{error}</div>}
            {files.length > 0 && (
                <ul className="space-y-1">
                    {files.map((f, i) => (
                        <li key={i} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-1.5 rounded">
                            <span className="truncate">{f.name} <span className="text-muted-foreground">({(f.size / 1024).toFixed(1)} KB)</span></span>
                            <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 ml-2 text-xs">✕</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
