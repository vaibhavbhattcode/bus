import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Save, RefreshCw, Shield, CheckCircle, Database, Server, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface SystemSetting {
    id: string;
    key: string;
    value: any;
    description: string;
    updatedAt: string;
    updatedBy: string;
}

export default function AdminSettings() {
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response: any = await api.get('/admin/settings');
            setSettings(response.data);
        } catch (error) {
            toast.error('Failed to load system settings');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key: string, value: any, description: string) => {
        setSaving(key);
        try {
            const response: any = await api.put(`/admin/settings/${key}`, { value, description });
            toast.success(`Setting ${key} updated successfully`);
            setSettings(settings.map(s => s.key === key ? response.data : s));
        } catch (error) {
            toast.error(`Failed to update ${key}`);
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    // Helper to safely render and edit the value
    const renderValueEditor = (setting: SystemSetting) => {
        const isBoolean = typeof setting.value === 'boolean';
        const isNumber = typeof setting.value === 'number';
        const isObject = typeof setting.value === 'object' && setting.value !== null;

        if (isBoolean) {
            return (
                <button
                    onClick={() => handleUpdate(setting.key, !setting.value, setting.description)}
                    disabled={saving === setting.key}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${setting.value ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                    <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${setting.value ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                </button>
            );
        }

        if (isNumber) {
            return (
                <div className="flex gap-2">
                    <input
                        type="number"
                        defaultValue={setting.value}
                        id={`input-${setting.key}`}
                        className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    />
                    <button
                        onClick={() => {
                            const el = document.getElementById(`input-${setting.key}`) as HTMLInputElement;
                            if (el) handleUpdate(setting.key, Number(el.value), setting.description);
                        }}
                        disabled={saving === setting.key}
                        className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
                    >
                        {saving === setting.key ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                </div>
            );
        }

        // Default string or JSON stringified
        return (
            <div className="flex gap-2">
                <input
                    type="text"
                    defaultValue={isObject ? JSON.stringify(setting.value) : String(setting.value)}
                    id={`input-${setting.key}`}
                    className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <button
                    onClick={() => {
                        const el = document.getElementById(`input-${setting.key}`) as HTMLInputElement;
                        if (el) {
                            let val = el.value;
                            if (isObject) {
                                try {
                                    val = JSON.parse(el.value);
                                } catch (e) {
                                    toast.error("Invalid JSON format");
                                    return;
                                }
                            }
                            handleUpdate(setting.key, val, setting.description);
                        }
                    }}
                    disabled={saving === setting.key}
                    className="p-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100"
                >
                    {saving === setting.key ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                </button>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Settings className="h-6 w-6 text-primary-600" />
                        Global Settings
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage system-wide configuration variables, features, and platform tuning in real-time.
                    </p>
                </div>

                <button
                    onClick={fetchSettings}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:text-primary-600 transition-colors shadow-sm"
                >
                    <RefreshCw className="h-4 w-4" />
                    <span>Reload Core Cache</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column - Core Health info */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Database className="h-5 w-5 text-indigo-500" />
                                Data Integrity
                            </h2>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center gap-3 text-sm text-green-700 bg-green-50 p-3 rounded-xl mb-4">
                                <CheckCircle className="h-5 w-5 shrink-0" />
                                <p>Database connected and schemas synchronized successfully.</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Server className="h-5 w-5 text-primary-500" />
                                Redis Cache
                            </h2>
                        </div>
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-500">Core Cache</span>
                                <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-500">Latency</span>
                                <span className="text-sm font-medium text-gray-900 border px-2 py-0.5 rounded-md border-gray-200">&lt; 2ms</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Columns - Settings Editor */}
                <div className="md:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 sm:p-6 pb-2">
                            <h3 className="text-base font-semibold leading-6 text-gray-900 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-gray-400" />
                                Environment Overrides
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 max-w-2xl">
                                Warning: Modifying these values edits the application's runtime behavior immediately.
                            </p>
                        </div>

                        <div className="border-t border-gray-100 divide-y divide-gray-100">
                            <AnimatePresence>
                                {settings.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm italic">
                                        No dynamic settings exist yet in the database.
                                    </div>
                                ) : (
                                    settings.map((setting, index) => (
                                        <motion.div
                                            key={setting.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-5 sm:p-6 hover:bg-gray-50/50 transition-colors"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-medium text-gray-900 font-mono bg-gray-100 select-all px-2 py-1 rounded inline-block">
                                                        {setting.key}
                                                    </h4>
                                                    <p className="mt-1 text-sm text-gray-500">
                                                        {setting.description || 'No description provided.'}
                                                    </p>
                                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                                                        <Clock className="h-3 w-3" />
                                                        <span>Last updated: {new Date(setting.updatedAt).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full sm:w-64 shrink-0 flex items-center justify-end sm:mt-0 mt-2">
                                                    {renderValueEditor(setting)}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
