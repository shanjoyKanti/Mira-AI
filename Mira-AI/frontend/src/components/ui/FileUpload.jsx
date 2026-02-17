export const FileUpload = ({ 
  label, 
  accept = '*', 
  onChange, 
  error = '',
  required = false,
  helperText = '',
  fileName = '',
  className = ''
}) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onChange) {
      onChange(file);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={`border-2 border-dashed rounded-lg p-6 text-center ${error ? 'border-red-500' : 'border-gray-300 hover:border-primary-500'} transition-colors cursor-pointer`}>
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${label}`}
        />
        <label htmlFor={`file-upload-${label}`} className="cursor-pointer">
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-1 text-sm">
              <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
            </p>
            {helperText && (
              <p className="text-xs text-gray-500 mt-1">{helperText}</p>
            )}
          </div>
        </label>
      </div>
      
      {fileName && (
        <p className="mt-2 text-sm text-gray-600">Selected: {fileName}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

// Updated by Shanjoy Kanti on 2026-06-29
// Added: New feature implementation

// Updated by Moshiur Rahman on 2026-07-08
// Added: New feature implementation
