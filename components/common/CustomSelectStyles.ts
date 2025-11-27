const customSelectStyles = {
  control: (provided: any, state: any) => ({
    ...provided,
    paddingLeft: "1.8rem",
    borderRadius: "0.375rem",
    border: "1px solid #94a3b8",
    minHeight: "1rem",
    backgroundColor: "transparent",
    boxShadow: state.isFocused
      ? "0 0 0 2px rgba(156, 163, 175, 0.3)"
      : undefined,
    "&:hover": { borderColor: "#94a3b8" },
  }),
  valueContainer: (provided: any) => ({
    ...provided,
    padding: "0 0.75rem",
  }),
  placeholder: (provided: any) => ({
    ...provided,
    color: "#6b7280",
    fontSize: "1rem",
  }),
  option: (provided: any, state: any) => ({
    ...provided,
    fontSize: "0.9rem",
    padding: "4px 8px",
    minHeight: "30px",
    backgroundColor: state.isFocused ? "#F0F0FF" : "white",
    color: "#374151",
    cursor: "pointer",
    paddingLeft: "1rem",
  }),
  menu: (provided: any) => ({
    ...provided,
    zIndex: 9999,
  }),

  singleValue: (provided: any) => ({
    ...provided,
    color: "#374151", // <-- FIXED normal dark text
    fontSize: "1rem",
  }),
};

export default customSelectStyles;