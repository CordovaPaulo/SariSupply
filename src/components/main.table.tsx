interface TableData {
  id: string;
  name: string;
  quantity: string;
  price: string;
  status: string;
}

interface TableProps {
  data: TableData[];
}

export default function Table({ data }: TableProps) {
  return (
    <table className="inventory-table">
      <thead>
        <tr>
          <th>Product ID</th>
          <th>Product Name</th>
          <th>Quantity</th>
          <th>Price</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id}>
            <td>{item.id}</td>
            <td>{item.name}</td>
            <td>{item.quantity}</td>
            <td>{item.price}</td>
            <td>{item.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}