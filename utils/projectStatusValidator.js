/**
 * Project Status Transition Validator
 * Validates if a status transition is allowed based on workflow rules
 */

const VALID_TRANSITIONS = {
  // Draft can go to Pending Review or Cancelled
  Draft: ["Pending Review", "Cancelled"],
  
  // Pending Review can go to Waiting for Engineers (admin approval), Rejected (admin), or Cancelled
  "Pending Review": ["Waiting for Engineers", "Rejected", "Cancelled"],
  
  // Waiting for Engineers can go to In Progress (when engineer assigned), or Cancelled
  "Waiting for Engineers": ["In Progress", "Cancelled"],
  
  // In Progress can go to Completed or Cancelled
  "In Progress": ["Completed", "Cancelled"],
  
  // Completed is final - can only go to Cancelled (rare case)
  "Completed": ["Cancelled"],
  
  // Rejected is final - no transitions allowed
  Rejected: [],
  
  // Cancelled is final - no transitions allowed
  Cancelled: [],
};

/**
 * Check if a status transition is valid
 * @param {string} currentStatus - Current project status
 * @param {string} newStatus - Desired new status
 * @param {string} userRole - Role of the user making the change
 * @param {object} project - Project object (for additional validation)
 * @returns {object} { valid: boolean, message?: string }
 */
function validateStatusTransition(currentStatus, newStatus, userRole, project = {}) {
  // Same status - always valid (no-op)
  if (currentStatus === newStatus) {
    return { valid: true };
  }

  // Check if transition is in valid transitions list
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      message: `لا يمكن تغيير الحالة من "${currentStatus}" إلى "${newStatus}". التحولات المسموحة: ${allowedTransitions.join(", ")}`,
    };
  }

  // Role-based validations
  if (userRole === "client") {
    // Clients can only set: Draft, Pending Review, Waiting for Engineers
    if (!["Draft", "Pending Review", "Waiting for Engineers"].includes(newStatus)) {
      return {
        valid: false,
        message: "العميل يمكنه فقط تغيير الحالة إلى: مسودة، في انتظار المراجعة، أو في انتظار المهندسين",
      };
    }
  }

  // Admin-only transitions
  const adminOnlyTransitions = ["Waiting for Engineers", "Rejected"];
  if (adminOnlyTransitions.includes(newStatus) && userRole !== "admin") {
    return {
      valid: false,
      message: "هذا التغيير يتطلب صلاحيات الأدمن فقط",
    };
  }

  // In Progress requires assigned engineer
  if (newStatus === "In Progress" && !project.assignedEngineer) {
    return {
      valid: false,
      message: "لا يمكن تغيير الحالة إلى 'قيد التنفيذ' بدون تعيين مهندس للمشروع",
    };
  }

  // Waiting for Engineers requires admin approval
  if (newStatus === "Waiting for Engineers" && project.adminApproval?.status !== "approved") {
    return {
      valid: false,
      message: "يجب الموافقة على المشروع من الأدمن أولاً",
    };
  }

  return { valid: true };
}

/**
 * Get all valid next statuses for a given current status
 * @param {string} currentStatus - Current project status
 * @param {string} userRole - Role of the user
 * @returns {string[]} Array of valid next statuses
 */
function getValidNextStatuses(currentStatus, userRole = "admin") {
  const allTransitions = VALID_TRANSITIONS[currentStatus] || [];
  
  // Filter based on user role
  if (userRole === "client") {
    return allTransitions.filter(status => 
      ["Draft", "Pending Review", "Waiting for Engineers"].includes(status)
    );
  }
  
  return allTransitions;
}

module.exports = {
  validateStatusTransition,
  getValidNextStatuses,
  VALID_TRANSITIONS,
};
