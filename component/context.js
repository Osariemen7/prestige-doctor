import React, { createContext, useContext, useState } from 'react';

const ReviewContext = createContext();

export const ReviewProvider = ({ children }) => {
    const [reviewId, setReview] = useState(null);

    return (
        <ReviewContext.Provider value={{ reviewId, setReview }}>
            {children}
        </ReviewContext.Provider>
    );
};

export const useReview = () => useContext(ReviewContext);
