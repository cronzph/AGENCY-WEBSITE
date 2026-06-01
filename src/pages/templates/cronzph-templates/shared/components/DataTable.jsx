export function DataTable({ columns = [], data = [], emptyMessage = 'No data available.' }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <div className="text-gray-400 text-4xl mb-3">📋</div>
                <p className="text-gray-500 text-sm">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-left font-medium text-gray-600 uppercase tracking-wider text-xs"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3 text-gray-700">
                                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
