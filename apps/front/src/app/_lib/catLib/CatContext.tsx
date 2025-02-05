import type React from "react";
import { type ReactNode, createContext, useContext, useState } from "react";

interface CatContextType {
  isThinking: boolean;
  setIsThinking: (value: boolean) => void;
  latestMessage: string;
  setLatestMessage: (message: string) => void;
}

const CatContext = createContext<CatContextType | undefined>(undefined);

export const CatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isThinking, setIsThinking] = useState(false);
  const [latestMessage, setLatestMessage] = useState("");

  return (
    <CatContext.Provider
      value={{ isThinking, setIsThinking, latestMessage, setLatestMessage }}
    >
      {children}
    </CatContext.Provider>
  );
};

export const useCatContext = () => {
  const context = useContext(CatContext);
  if (context === undefined) {
    throw new Error("useCatContext must be used within a CatProvider");
  }
  return context;
};
