import React from "react";

interface Props {
  name: string;
  value: number;
}

const StatBlock = ({ name, value }: Props) => (
  <div className="flex justify-between items-center border rounded-md p-2">
    <span>{name}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default StatBlock;