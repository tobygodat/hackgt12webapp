import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { analyzeWithGemini } from "../lib/gemini.js";

export default function FloatingChat({ transactionData }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            id: 1,
            type: "assistant",
            content: "Hi! I'm your CartWatch financial assistant. I can help you understand your spending patterns and make smarter financial decisions. Here are some things you can ask me:\n\n• \"How much did I spend this month?\"\n• \"What are my biggest spending categories?\"\n• \"How can I save money on groceries?\"\n• \"Should I be worried about my spending?\"\n• \"Give me budgeting tips\"\n\nWhat would you like to know about your finances?"
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when messages change
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    // Scroll to bottom when chat is opened
    useEffect(() => {
        if (isOpen) {
            // Small delay to ensure DOM is rendered
            setTimeout(scrollToBottom, 100);
        }
    }, [isOpen]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage = {
            id: Date.now(),
            type: "user",
            content: inputValue.trim()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Prepare comprehensive financial context from transaction data
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            const currentMonthTransactions = transactionData?.filter(t => {
                const date = new Date(t.purchase_date || t.date);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            }) || [];

            const lastMonthTransactions = transactionData?.filter(t => {
                const date = new Date(t.purchase_date || t.date);
                const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
            }) || [];

            const financialContext = {
                totalTransactions: transactionData?.length || 0,
                currentMonthSpending: currentMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
                lastMonthSpending: lastMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0),
                currentMonthTransactionCount: currentMonthTransactions.length,
                topCategories: getTopCategories(transactionData || []),
                recentTransactions: transactionData?.slice(0, 5).map(t => ({
                    amount: t.amount,
                    category: t.category || t.description,
                    date: t.purchase_date || t.date,
                    merchant: t.merchant
                })) || [],
                averageTransactionAmount: transactionData?.length ?
                    transactionData.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) / transactionData.length : 0,
                spendingTrend: currentMonthTransactions.length > 0 && lastMonthTransactions.length > 0 ?
                    ((currentMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) -
                      lastMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)) /
                     lastMonthTransactions.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)) * 100 : 0
            };

            // Get recent conversation history (last 6 messages for context)
            const conversationHistory = messages.slice(-6).map(msg => ({
                role: msg.type === "user" ? "user" : "assistant",
                content: msg.content
            }));

            // Add current user message to history
            conversationHistory.push({
                role: "user",
                content: userMessage.content
            });

            const response = await analyzeWithGemini(userMessage.content, financialContext, conversationHistory);

            const assistantMessage = {
                id: Date.now() + 1,
                type: "assistant",
                content: response
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error("Error getting AI response:", error);
            const errorMessage = {
                id: Date.now() + 1,
                type: "assistant",
                content: "I'm having trouble processing your request right now. Please try again in a moment."
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getTopCategories = (transactions) => {
        const categories = {};
        transactions.forEach(t => {
            const category = t.category || t.description || "Other";
            categories[category] = (categories[category] || 0) + Math.abs(t.amount || 0);
        });

        return Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));
    };

    return (
        <>
            {/* Floating Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-14 h-14 bg-brand text-white rounded-full shadow-lg hover:bg-brand-dark transition-all duration-200 flex items-center justify-center z-50 hover:scale-110"
                    aria-label="Open financial assistant chat"
                >
                    <MessageCircle size={24} />
                </button>
            )}

            {/* Chat Modal */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-card border border-border rounded-lg shadow-xl z-50 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div>
                            <h3 className="font-semibold text-text">Financial Assistant</h3>
                            <p className="text-sm text-text-muted">Powered by Gemini AI</p>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-text-muted hover:text-text transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        message.type === "user"
                                            ? "bg-brand text-white"
                                            : "bg-surface text-text"
                                    }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-surface text-text rounded-lg px-3 py-2">
                                    <div className="flex space-x-1">
                                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: "0.1s"}}></div>
                                        <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{animationDelay: "0.2s"}}></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invisible element to scroll to */}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-border">
                        <div className="flex space-x-2">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about your spending, budgeting tips, or financial advice..."
                                className="flex-1 resize-none bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                                rows="2"
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="px-3 py-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}