import React from 'react';

function MainProgressBar({ step = 1, totalSteps = 10, title = 'Project Input' }) {
    // support both `total` (legacy) and `totalSteps` props
    const total = Number(totalSteps || 10);
    const safeStep = Math.min(Math.max(1, Number(step) || 1), total);
    const percent = total > 1 ? Math.round(((safeStep - 1) / (total - 1)) * 100) : 100;
    const percentLabel = Math.round((safeStep / total) * 100);
    const steps = Array.from({ length: total }, (_, i) => i + 1);

    return (
        <div className="mb-16">
            <div className="flex items-center justify-between mb-5">
                <div>
                    {/* <div className="text-sm font-medium text-gray-700">Step {safeStep} of {total}</div> */}
                    <div className="text-xs text-gray-500">{title}</div>
                </div>
                <div className="text-sm font-semibold text-gray-700">{percent}%</div>
            </div>

            <div className="relative">
                <div
                    className="relative w-full h-3 rounded-full bg-gray-200 overflow-hidden z-0"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentLabel}
                    aria-label={`Progress: ${percentLabel}%`}
                >
                    <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-indigo-700 transition-all duration-500 ease-out z-0 shadow-sm"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                <div className="absolute left-0 right-0 top-0 mt-[-12px] pointer-events-none z-10">
                    {steps.map((s) => {
                        const pos = total > 1 ? ((s - 1) / (total - 1)) * 100 : 100;
                        const completed = s < safeStep;
                        const isCurrent = s === safeStep;
                        return (
                            <div
                                key={s}
                                className="absolute top-0 flex flex-col items-center"
                                style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shadow-sm pointer-events-auto ${completed ? 'bg-indigo-600 text-white' : isCurrent ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-white border border-gray-300 text-gray-600'}`}
                                >
                                    {completed ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <span className="text-[11px]">{s}</span>
                                    )}
                                </div>
                                <div className="mt-2 text-[10px] text-gray-500">
                                    {s === 1 ? 'Start' : s === total ? 'Finish' : `Step ${s}`}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default MainProgressBar;
// Dev: Arafat Uddin - 2026-03-23
