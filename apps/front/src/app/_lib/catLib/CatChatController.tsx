"use client";

import { useAuth } from "@/app/auth/useAuth";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AllInteractionTypes,
  type CatId,
  INTERACTION_TYPE,
  type InteractionType,
  type UserItemId,
} from "cat-sdk";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ChevronDown, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ItemDropdown } from "./ItemDropdown";
import {
  useCatInteractions,
  useCatState,
  useInteractWithCat,
  useIsAIResponding,
} from "./catHooks";

interface CatInteractionProps {
  catId: CatId;
}

const getActionBadgeVariant = (type: AllInteractionTypes) => {
  switch (type) {
    case "PET":
      return "default";
    case "FEED":
      return "secondary";
    case "PLAY":
      return "success";
    case "CHAT":
      return "info";
    case "AUTONOMOUS_THOUGHT":
      return "warning";
    default:
      return "default";
  }
};

function TypingIndicator(props: { catId: CatId }) {
  const { data: catState } = useCatState(props.catId);
  return (
    <motion.div
      className="flex items-center gap-1 px-4 py-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {catState?.name} is thinking...
      </span>
    </motion.div>
  );
}

export function CatChatController({ catId }: CatInteractionProps) {
  const { data: catState, isLoading: isLoadingCat } = useCatState(catId);
  const { data: interactionsData, isLoading: isLoadingInteractions } =
    useCatInteractions({
      catId,
      page: 1,
      pageSize: 50,
    });
  const { mutate, isPending } = useInteractWithCat(catId);
  const { user } = useAuth();
  const isAIResponding = useIsAIResponding();
  const [type, setType] = useState<InteractionType>("CHAT");
  const [input, setInput] = useState<string>("");
  const [selectedItemId, setSelectedItemId] = useState<UserItemId>();
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [showScrollNotification, setShowScrollNotification] = useState(false);
  const lastInteractionCountRef = useRef(0);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
        setShowScrollNotification(false);
      }
    }
  }, []);

  useEffect(() => {
    const currentInteractionCount = interactionsData?.interactions.length ?? 0;

    if (shouldAutoScroll) {
      scrollToBottom();
      setShouldAutoScroll(false);
    } else if (currentInteractionCount > lastInteractionCountRef.current) {
      setShowScrollNotification(true);
    }

    lastInteractionCountRef.current = currentInteractionCount;
  }, [interactionsData?.interactions, shouldAutoScroll, scrollToBottom]);

  const handleInteract = () => {
    setShouldAutoScroll(true);
    mutate(
      { type, input, userItemId: selectedItemId },
      {
        onSuccess: () => {
          setInput("");
          setSelectedItemId(undefined);
        },
      },
    );
  };

  if (isLoadingCat || isLoadingInteractions) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        {/* Message skeleton loading state */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            {/* Timestamp skeleton */}
            <Skeleton className="mx-auto h-3 w-24" />

            {/* Message container skeleton */}
            <div className="rounded-lg border border-border/40 bg-gradient-to-b from-background/80 to-background/40 p-2">
              {/* User message skeleton */}
              <div className="flex flex-col items-end gap-2 border-b border-border/40 pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-24" />
                </div>
                <Skeleton className="h-12 w-4/5" />
              </div>

              {/* Cat response skeleton */}
              <div className="flex flex-col items-start gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex gap-1">
                    <Skeleton className="size-6" />
                    <Skeleton className="size-6" />
                  </div>
                </div>
                <Skeleton className="h-12 w-4/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="font-pixel flex flex-col gap-2 px-2 py-1">
            {interactionsData?.interactions
              .slice()
              .reverse()
              .map((interaction, index) => (
                <motion.div
                  key={interaction.id}
                  className="flex flex-col gap-1"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                >
                  {/* Timestamp */}
                  <div className="text-center text-[10px] text-muted-foreground">
                    {format(new Date(interaction.createdAt), "PPpp")}
                  </div>

                  {/* Message group container */}
                  <div className="rounded-lg border border-border/40 bg-gradient-to-b from-background/80 to-background/40 p-2 shadow-md backdrop-blur-sm transition-all hover:shadow-lg">
                    {/* User message */}
                    <div className="flex flex-col items-end gap-1 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={getActionBadgeVariant(interaction.type)}
                          className="text-xs font-medium duration-300 animate-in fade-in"
                        >
                          {interaction.type.charAt(0).toUpperCase() +
                            interaction.type.slice(1)}
                        </Badge>
                        <span className="font-bold text-primary">
                          {interaction.user.username ?? interaction.userId}
                        </span>
                      </div>
                      {interaction.input && (
                        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-primary/90 px-4 py-2 text-sm text-primary-foreground shadow-sm">
                          {interaction.input}
                        </div>
                      )}
                    </div>

                    {/* Cat response */}
                    <div className="flex flex-col items-start gap-1 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">
                          {catState?.name}
                        </span>
                      </div>
                      <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gradient-to-br from-card to-card/90 px-4 py-2 text-sm text-card-foreground shadow-sm">
                        {interaction.output}
                      </div>
                    </div>
                  </div>

                  {/* Add error state handling */}
                  {interaction.status === "FAILED" && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="ml-6 max-w-[80%] rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive"
                    >
                      Error: {"Failed to process response"}
                    </motion.div>
                  )}
                </motion.div>
              ))}

            {/* Show typing indicator when AI is responding */}
            {isAIResponding && <TypingIndicator catId={catId} />}
          </div>
        </ScrollArea>
      </div>

      {showScrollNotification && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={scrollToBottom}
          className="absolute bottom-[80px] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-lg"
        >
          <ChevronDown className="size-4" />
          New messages
        </motion.button>
      )}

      {/* Input area - adjust padding for mobile */}
      {user ? (
        <div className="sticky bottom-0 z-50 flex flex-col gap-1 border-t bg-background/95 p-1.5 shadow-lg backdrop-blur-md">
          {/* Action selection row - more compact */}
          <div className="flex gap-1">
            <Select
              onValueChange={(value) => setType(value as InteractionType)}
            >
              <SelectTrigger className="h-8 w-[100px] border-border/40 bg-background/80 text-sm text-foreground backdrop-blur-sm transition-colors hover:bg-background/90">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {INTERACTION_TYPE.map((action) => (
                  <SelectItem key={action} value={action} className="text-sm">
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(type === "FEED" || type === "PLAY") && (
              <ItemDropdown onSelect={(item) => setSelectedItemId(item.id)} />
            )}
          </div>

          {/* Text input row - more compact */}
          <div className="flex gap-1">
            <Input
              placeholder="Send a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="grow border-border/40 bg-background/80 text-foreground backdrop-blur-sm transition-colors focus:border-primary/50"
              onKeyPress={(e) =>
                e.key === "Enter" && !isPending && handleInteract()
              }
              disabled={isPending || isAIResponding}
            />
            <Button
              onClick={handleInteract}
              className="h-8 bg-primary px-2 text-primary-foreground shadow-md transition-colors hover:bg-primary/90 hover:shadow-lg"
              disabled={isPending || isAIResponding}
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 z-50 flex items-center justify-center space-x-2 border-t bg-background/95 p-2 shadow-lg backdrop-blur-md">
          <ConnectWallet />
        </div>
      )}
    </div>
  );
}
