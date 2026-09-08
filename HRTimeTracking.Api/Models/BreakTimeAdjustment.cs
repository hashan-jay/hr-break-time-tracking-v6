namespace HRTimeTracking.Api.Models;

/// <summary>
/// Developer-only minute adjustment for one employee, shift-start date, and break type.
/// Original BreakSession rows are never changed. Displayed total = raw total − minutes × 60.
/// </summary>
public class BreakTimeAdjustment
{
    public const int MaxAttempts = 2;

    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public DateOnly BreakDate { get; set; }
    public string BreakType { get; set; } = BreakTypes.Meal;
    public int AdjustmentMinutes { get; set; }
    public int AttemptsUsed { get; set; }
    public string? UpdatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public static class BreakTimeAdjustmentMath
{
    public static int Apply(int rawSeconds, int adjustmentMinutes)
    {
        var minutes = Math.Max(0, adjustmentMinutes);
        return Math.Max(0, rawSeconds - minutes * 60);
    }
}
