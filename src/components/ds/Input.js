import { jsx as _jsx } from "react/jsx-runtime";
const Input = ({ className, ...rest }) => (_jsx("input", { className: `w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`, ...rest }));
export default Input;
