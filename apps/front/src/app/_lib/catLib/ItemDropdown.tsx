import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import type { UserItem } from "./CatActions";
import { useGetUserItems } from "./catHooks";

interface ItemDropdownProps {
  onSelect: (item: UserItem) => void;
}

interface ComboboxItem {
  value: string;
  label: string;
  imageUrl?: string;
  originalItem: UserItem;
}

export function ItemDropdown({ onSelect }: ItemDropdownProps) {
  const [value, setValue] = useState<ComboboxItem | null>(null);
  const { data: userItems, isLoading } = useGetUserItems();

  if (isLoading) {
    return <Skeleton className="h-10 w-full rounded-md" />;
  }

  if (!userItems || userItems.length === 0) {
    return <div>No items available.</div>;
  }

  console.log("ItemDropdown,", userItems);

  const comboboxItems: ComboboxItem[] = userItems.map((userItem) => ({
    value: userItem.id,
    label: `${userItem.item.name} (${userItem.quantity})`,
    imageUrl: userItem.item.imageUrl,
    originalItem: userItem,
  }));

  const handleSelect = (selectedItem: ComboboxItem | null) => {
    setValue(selectedItem);
    if (selectedItem) {
      onSelect(selectedItem.originalItem);
    }
  };

  return (
    <Combobox
      items={comboboxItems}
      value={value}
      onChange={handleSelect}
      placeholder="Select item..."
    />
  );
}
