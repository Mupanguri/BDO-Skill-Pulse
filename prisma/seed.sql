-- Clear existing data
DELETE FROM QuizResponse;
DELETE FROM QuizSession;
DELETE FROM User;
DELETE FROM UserNotification;
DELETE FROM AuditLog;
DELETE FROM QuestionBank;

-- Insert Admin User (Password: Password123!)
INSERT INTO User (id, email, password, department, isAdmin, createdAt)
VALUES (
  'admin-001',
  'admin@bdo.co.zw',
  '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO',
  'IT',
  1,
  datetime('now')
);

-- Insert Tax Department Users
INSERT INTO User (id, email, password, department, isAdmin, createdAt) VALUES
('user-001', 'john.doe@bdo.co.zw', '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO', 'Tax', 0, datetime('now')),
('user-002', 'jane.smith@bdo.co.zw', '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO', 'Tax', 0, datetime('now')),
('user-003', 'michael.jones@bdo.co.zw', '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO', 'Tax', 0, datetime('now'));

-- Insert Audit Department Users
INSERT INTO User (id, email, password, department, isAdmin, createdAt) VALUES
('user-004', 'sarah.wilson@bdo.co.zw', '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO', 'Audit', 0, datetime('now')),
('user-005', 'david.brown@bdo.co.zw', '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO', 'Audit', 0, datetime('now'));

-- Insert Consulting User
INSERT INTO User (id, email, password, department, isAdmin, createdAt) VALUES
('user-006', 'emily.davis@bdo.co.zw', '$2b$10$S88fpOPQO4QsGrmym3o7UOeKl5eLDpY9aK.mjCrUms62KA.2DtJgO', 'Consulting', 0, datetime('now'));

-- Insert Active Tax Quiz
INSERT INTO QuizSession (id, name, date, time, questions, createdBy, isActive, createdAt) VALUES (
  'quiz-001',
  'Q1 2024 Tax Fundamentals',
  datetime('2024-03-15'),
  '300',
  '[{"id":"1","text":"What is the current VAT rate in Zimbabwe?","options":["14.5%","15%","16%","17.5%"],"correctAnswer":0,"type":"multiple-choice"},{"id":"2","text":"Which form is used for corporate tax returns?","options":["IT12","IT14","IT4","VAT7"],"correctAnswer":0,"type":"multiple-choice"},{"id":"3","text":"Are capital gains taxable in Zimbabwe?","options":["True","False"],"correctAnswer":0,"type":"true-false"},{"id":"4","text":"What is the standard corporate tax rate?","options":["24%","25%","26%","30%"],"correctAnswer":1,"type":"multiple-choice"}]',
  'admin@bdo.co.zw',
  1,
  datetime('now')
);

-- Insert Active Audit Quiz
INSERT INTO QuizSession (id, name, date, time, questions, createdBy, isActive, createdAt) VALUES (
  'quiz-002',
  'Audit Standards & Procedures Q1 2024',
  datetime('2024-03-20'),
  '360',
  '[{"id":"1","text":"What does ISA stand for?","options":["International Standards on Auditing","Internal Standards on Auditing","Integrated Systems Audit","Internal Security Assessment"],"correctAnswer":0,"type":"multiple-choice"},{"id":"2","text":"Which ISA deals with audit documentation?","options":["ISA 230","ISA 240","ISA 315","ISA 500"],"correctAnswer":0,"type":"multiple-choice"},{"id":"3","text":"Is audit evidence always conclusive?","options":["True","False"],"correctAnswer":1,"type":"true-false"},{"id":"4","text":"What is materiality in auditing?","options":["The physical documents used in an audit","The threshold above which misstatements are significant","The time taken to complete an audit","The number of auditors assigned to a job"],"correctAnswer":1,"type":"multiple-choice"}]',
  'admin@bdo.co.zw',
  1,
  datetime('now')
);

-- Insert Completed Quiz
INSERT INTO QuizSession (id, name, date, time, questions, createdBy, isActive, createdAt) VALUES (
  'quiz-003',
  'Tax Compliance Q4 2023',
  datetime('2023-12-10'),
  '300',
  '[{"id":"1","text":"What is the deadline for filing individual tax returns?","options":["31 March","30 April","31 May","30 June"],"correctAnswer":0,"type":"multiple-choice"},{"id":"2","text":"Are dividends subject to withholding tax?","options":["True","False"],"correctAnswer":0,"type":"true-false"},{"id":"3","text":"What is the penalty for late filing?","options":["5%","10%","15%","20%"],"correctAnswer":1,"type":"multiple-choice"}]',
  'admin@bdo.co.zw',
  0,
  datetime('now', '-60 days')
);

-- Insert Quiz Responses for Completed Quiz
INSERT INTO QuizResponse (id, sessionId, userId, answers, score, timeSpent, completedAt) VALUES
('response-001', 'quiz-003', 'user-001', '{"0":0,"1":0,"2":1}', 100, 180, datetime('2023-12-11')),
('response-002', 'quiz-003', 'user-002', '{"0":0,"1":1,"2":1}', 67, 240, datetime('2023-12-12')),
('response-003', 'quiz-003', 'user-003', '{"0":1,"1":0,"2":2}', 33, 290, datetime('2023-12-13')),
('response-004', 'quiz-003', 'user-004', '{"0":0,"1":0,"2":1}', 100, 150, datetime('2023-12-11'));

-- Insert Notifications
INSERT INTO UserNotification (id, userEmail, type, title, message, adminEmail, quizName, departmentName, read, timestamp) VALUES
('notif-001', 'john.doe@bdo.co.zw', 'quiz_posted', 'New Quiz Available', 'ADMIN has posted a quiz for the Tax department to be completed within the stated time lines.', 'admin@bdo.co.zw', 'Q1 2024 Tax Fundamentals', 'Tax', 0, datetime('now')),
('notif-002', 'sarah.wilson@bdo.co.zw', 'quiz_posted', 'New Quiz Available', 'ADMIN has posted a quiz for the Audit department to be completed within the stated time lines.', 'admin@bdo.co.zw', 'Audit Standards & Procedures Q1 2024', 'Audit', 0, datetime('now'));

-- Insert Audit Logs
INSERT INTO AuditLog (id, adminEmail, action, details, ipAddress, userAgent, timestamp) VALUES
('log-001', 'admin@bdo.co.zw', 'create_quiz', '{"quizName":"Q1 2024 Tax Fundamentals","department":"Tax","questionsCount":4}', '192.168.1.1', 'Mozilla/5.0', datetime('now')),
('log-002', 'admin@bdo.co.zw', 'create_quiz', '{"quizName":"Audit Standards & Procedures Q1 2024","department":"Audit","questionsCount":4}', '192.168.1.1', 'Mozilla/5.0', datetime('now'));

-- Insert Question Bank
INSERT INTO QuestionBank (id, questionText, questionType, options, correctAnswer, category, difficulty, tags, createdBy, createdAt) VALUES
('qb-001', 'What is the basic principle of double-entry bookkeeping?', 'multiple-choice', '["Every debit must have a corresponding credit","Record transactions twice","Use two different accounting systems","Keep two sets of books"]', '0', 'Accounting', 'easy', '["accounting","basics","bookkeeping"]', 'admin@bdo.co.zw', datetime('now')),
('qb-002', 'Is goodwill an intangible asset?', 'true-false', '["True","False"]', '0', 'Financial Reporting', 'medium', '["assets","financial-reporting","ifrs"]', 'admin@bdo.co.zw', datetime('now'));
