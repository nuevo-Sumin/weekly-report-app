export function toDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekRange(dateValue) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const day = date.getDay();
  const mondayOffset = date.getDate() - (day === 0 ? 6 : day - 1);
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
