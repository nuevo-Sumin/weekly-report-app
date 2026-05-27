export function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

export function getWeekRange(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const day = date.getDay();
  const mondayOffset = date.getDate() - (day === 0 ? 5 : day - 2);
  const monday = new Date(date);
  monday.setDate(mondayOffset);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  return {
    startDate: toDateInputValue(monday),
    endDate: toDateInputValue(friday),
  };
}

export function formatDate(dateValue) {
  return dateValue.replaceAll('-', '.');
}
