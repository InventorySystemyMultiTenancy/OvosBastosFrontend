export function Table({ columns, rows, rowKey, emptyMessage = 'Nenhum registro encontrado.', className = '', wrapRef }) {
  return (
    <div className={`table-wrap ${className}`.trim()} ref={wrapRef}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr className="empty-row">
              <td colSpan={columns.length}>{emptyMessage}</td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
