"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import styles from "./Button.module.scss";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
    children: ReactNode;
    variant?: ButtonVariant;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
    children,
    className,
    type = "button",
    variant = "primary",
    ...props
}: ButtonProps) {
    const variantClassName =
        variant === "secondary" ? styles.secondary : styles.primary;

    return (
        <button
            {...props}
            className={[styles.button, variantClassName, className]
                .filter(Boolean)
                .join(" ")}
            type={type}
        >
            {children}
        </button>
    );
}
