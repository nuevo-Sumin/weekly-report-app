export function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekRange(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    startDate: toDateInputValue(monday),
    endDate: toDateInputValue(sunday),
  };
}

export function formatDate(dateValue) {
  return dateValue.replaceAll('-', '.');
}

