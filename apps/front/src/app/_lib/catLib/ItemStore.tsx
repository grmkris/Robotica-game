import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ItemId } from "cat-sdk";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { toast } from "sonner";
import { useBuyItem, useGetAllItems, useGetUserItems } from "./catHooks";

const tabContentVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  },
};

const tabTriggerVariants = {
  inactive: { scale: 1 },
  active: { scale: 1.05 },
};

export function ItemStore() {
  const { data: allItems, isLoading: isLoadingAllItems } = useGetAllItems();
  const { data: userItems, isLoading: isLoadingUserItems } = useGetUserItems();
  const { mutate: buyItem, isPending: isBuying } = useBuyItem();

  const handleBuyItem = (itemId: ItemId) => {
    buyItem(
      { itemId, quantity: 1 },
      {
        onSuccess: () => {
          toast.success("Item purchased", {
            description: "The item has been added to your inventory.",
          });
        },
        onError: (error) => {
          toast.error("Purchase failed", {
            description: error.message,
          });
        },
      },
    );
  };

  if (isLoadingAllItems || isLoadingUserItems) {
    return (
      <Card className="h-full">
        <CardContent>
          <Tabs defaultValue="store">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="store">Store</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[400px] pr-4">
              {Array.from({ length: 4 }).map((_) => (
                <div
                  key={Number(_)}
                  className="mb-4 flex items-center space-x-4"
                >
                  <Skeleton className="size-20 rounded-md" />
                  <div className="grow space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[200px]" />
                    <Skeleton className="h-3 w-[100px]" />
                  </div>
                  <Skeleton className="h-9 w-[60px]" />
                </div>
              ))}
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent>
        <Tabs defaultValue="store">
          <TabsList className="grid w-full grid-cols-2">
            <motion.div
              variants={tabTriggerVariants}
              whileHover="active"
              whileTap={{ scale: 0.95 }}
            >
              <TabsTrigger value="store">Store</TabsTrigger>
            </motion.div>
            <motion.div
              variants={tabTriggerVariants}
              whileHover="active"
              whileTap={{ scale: 0.95 }}
            >
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </motion.div>
          </TabsList>
          <AnimatePresence mode="wait">
            <motion.div
              key="store"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <TabsContent value="store">
                <ScrollArea className="h-[400px] pr-4">
                  {allItems?.map((item) => (
                    <div
                      key={item.id}
                      className="mb-4 flex items-center space-x-4"
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={80}
                        height={80}
                        className="rounded-md object-cover"
                      />
                      <div className="grow">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                        <p className="text-sm font-medium">
                          Price: {item.price}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleBuyItem(item.id)}
                        disabled={isBuying}
                      >
                        Buy
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </motion.div>
            <motion.div
              key="inventory"
              variants={tabContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <TabsContent value="inventory">
                <ScrollArea className="h-[400px] pr-4">
                  {userItems?.map((userItem) => (
                    <div
                      key={userItem.id}
                      className="mb-4 flex items-center space-x-4"
                    >
                      <Image
                        src={userItem.item.imageUrl}
                        alt={userItem.item.name}
                        width={80}
                        height={80}
                        className="rounded-md object-cover"
                      />
                      <div>
                        <h3 className="font-semibold">{userItem.item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {userItem.item.description}
                        </p>
                        <p className="text-sm font-medium">
                          Quantity: {userItem.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </CardContent>
    </Card>
  );
}
